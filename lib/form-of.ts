import "server-only";
import { DictionaryError, lookupWord } from "./dictionary";
import { normalizeDictionary, type NormalizedDictionary } from "./normalize";
import {
  detectFormOfGloss,
  suffixCandidates,
  type FormCandidate,
} from "./word-forms";
import type { Entry, FormKind, FormOf } from "./types";

/**
 * Approach A (the Wiktionary gloss) is authoritative. Approach B (suffix rules)
 * only runs when the word is absent from the dictionary entirely, and a
 * candidate is accepted only after the dictionary confirms it. That guard is
 * what keeps `his` from becoming a plural of `hi`.
 */
const MAX_CANDIDATE_LOOKUPS = 2;
const LOOKUP_PATTERN = /^[a-z][a-z'-]*$/i;

export type FormResolution = {
  formOf: FormOf;
  /** `null` when the lemma could not be fetched; the relation still stands. */
  lemma: NormalizedDictionary | null;
};

async function fetchLemma(
  rawWord: string,
): Promise<NormalizedDictionary | null> {
  const word = rawWord.trim().toLowerCase();
  // A phrasal lemma (`give up`) is valid for the label but not for the provider.
  if (!LOOKUP_PATTERN.test(word)) return null;

  try {
    const normalized = normalizeDictionary(await lookupWord(word));
    return normalized.entries.length > 0 ? normalized : null;
  } catch (error) {
    if (error instanceof DictionaryError) return null;
    // An outage must never hide a word the user already opened.
    console.error(`Unable to load the lemma "${word}".`, error);
    return null;
  }
}

function partOfSpeech(entries: Entry[]): string {
  return entries[0]?.partOfSpeech?.trim().toLowerCase() ?? "";
}

/**
 * Confirms that the lemma's part of speech can actually take this inflection.
 * `-er` on a noun (`runner`) is a different word, not a comparative.
 */
function refineKind(
  candidate: FormCandidate,
  entries: Entry[],
): FormKind | null {
  const pos = partOfSpeech(entries);
  const isVerb = pos.includes("verb");
  const isModifier = pos.includes("adjective") || pos.includes("adverb");

  if (candidate.kind === "plural") return isVerb ? "third-person" : "plural";
  if (candidate.kind === "past") return isVerb ? "past" : null;
  if (candidate.kind === "present-participle") {
    return isVerb ? "present-participle" : null;
  }
  if (candidate.kind === "comparative" || candidate.kind === "superlative") {
    return isModifier ? candidate.kind : null;
  }
  return candidate.kind;
}

/**
 * Resolves the relation between `word` and its lemma.
 *
 * `missing` says the word is not in the dictionary at all, which is the only
 * case where the suffix rules are allowed to guess. When the word exists, its
 * own gloss decides; a word with a real primary sense (`saw`, `left`, `better`)
 * is left alone.
 */
export async function resolveFormOf({
  word,
  entries,
  missing = false,
}: {
  word: string;
  entries: Entry[];
  missing?: boolean;
}): Promise<FormResolution | null> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return null;

  if (!missing) {
    const formOf = detectFormOfGloss(entries, normalized);
    if (!formOf) return null;
    return { formOf, lemma: await fetchLemma(formOf.lemma) };
  }

  for (const candidate of suffixCandidates(normalized).slice(
    0,
    MAX_CANDIDATE_LOOKUPS,
  )) {
    const lemma = await fetchLemma(candidate.word);
    if (!lemma) continue;

    // A candidate that is itself a form (`runned` → `runn`) would only chain
    // glosses; the real lemma is further back or not available at all.
    if (detectFormOfGloss(lemma.entries, lemma.normalized_word)) continue;

    const kind = refineKind(candidate, lemma.entries);
    if (!kind) continue;

    return { formOf: { kind, lemma: lemma.word }, lemma };
  }

  return null;
}
