import "server-only";
import { ensureTranslation, mergeAiTranslation } from "@/lib/ai-translations";
import { lookupWord } from "@/lib/dictionary";
import { normalizeDictionary } from "@/lib/normalize";
import { fillWordEntries } from "@/lib/user-words";
import { isEligible } from "./cards.ts";
import { listRecallWords } from "./repository.ts";
import type { RecallWord } from "./types.ts";

export type RepairResult = {
  /** Words that could not produce a prompt before the repair ran. */
  checked: number;
  /** Words that can produce a prompt now. */
  repaired: number;
  /** Words that still cannot, because no source had anything to give. */
  remaining: number;
};

/**
 * Fills the data gaps that keep a saved word out of Recall.
 *
 * A word is ineligible when it has no translation, definition, or usable
 * example. That happens for two reasons: the row predates the dictionary v2
 * migration and has an empty `entries` array, or the provider genuinely has
 * nothing for it. The first case is repaired by re-fetching the entry; the
 * second falls back to the AI translation cache, which is a no-op when no key
 * is configured.
 *
 * The function is best-effort and sequential on purpose: it runs behind an
 * explicit user action, and a provider timeout must not turn into a burst of
 * parallel requests.
 */
export async function repairRecallWords(
  userId: string,
  language: string,
): Promise<RepairResult> {
  const words = await listRecallWords(userId);
  const broken = words.filter((word) => !isEligible(word, language));

  let repaired = 0;

  for (const word of broken) {
    const fixed = await repairWord(word, language);
    if (fixed) repaired += 1;
  }

  const remaining = broken.length - repaired;
  return { checked: broken.length, repaired, remaining };
}

/** Returns true when the word can produce a prompt after the attempt. */
async function repairWord(
  word: RecallWord,
  language: string,
): Promise<boolean> {
  let entries = word.entries;

  if (entries.length === 0) {
    try {
      const normalized = normalizeDictionary(await lookupWord(word.word));
      await fillWordEntries(normalized);
      entries = normalized.entries;
    } catch (error) {
      console.error(`Unable to refresh "${word.word}" for recall.`, error);
      return false;
    }
  }

  if (isEligible({ ...word, entries }, language)) return true;

  const cached = await ensureTranslation(
    { word: word.word, entries },
    language,
  );
  if (cached) {
    entries = mergeAiTranslation(entries, cached, language);
  }

  return isEligible({ ...word, entries }, language);
}
