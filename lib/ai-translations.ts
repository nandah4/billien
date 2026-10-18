import "server-only";
import {
  AiUnavailableError,
  aiModel,
  chatCompletion,
  isAiConfigured,
} from "@/lib/ai";
import { languageName } from "@/lib/language";
import { sql } from "@/lib/neon";
import {
  PROMPT_VERSION,
  buildTranslationMessages,
  hasDictionaryTranslation,
  readTranslationReply,
  targetSense,
  targetSenseIndex,
  type CachedAiTranslation,
  type GeneratedTranslation,
} from "@/lib/translate";
import type { Entry } from "@/lib/types";

const MAX_ATTEMPTS = 3;
/**
 * The configured model reasons before it answers, and those tokens come out of
 * `max_tokens`. At 120 the reply was cut mid-JSON, which looked like an invalid
 * translation rather than a budget problem. A real answer needs about 130.
 */
const MAX_TOKENS = 512;
/** A `pending` row older than this is treated as abandoned and may be retried. */
const STALE_PENDING_INTERVAL = "90 seconds";
/**
 * After this long, a failed row may be claimed again even when it used every
 * attempt. Without it, a provider outage would permanently mark a good word as
 * untranslatable.
 */
const RETRY_COOLDOWN_INTERVAL = "1 hour";

export { hasDictionaryTranslation, mergeAiTranslation } from "@/lib/translate";
export type { CachedAiTranslation } from "@/lib/translate";

async function generate({
  word,
  entries,
  language,
}: {
  word: string;
  entries: Entry[];
  language: string;
}): Promise<GeneratedTranslation | null> {
  const sense = targetSense(entries);
  const senseIndex = targetSenseIndex(entries);
  if (!sense || senseIndex === null) return null;

  const entry = entries.find((item) => item.senses.includes(sense));
  const raw = await chatCompletion(
    buildTranslationMessages({
      word,
      partOfSpeech: entry?.partOfSpeech ?? "",
      definition: sense.definition,
      languageLabel: languageName(language),
    }),
    { temperature: 0, maxTokens: MAX_TOKENS },
  );

  return readTranslationReply(raw, { word, senseIndex });
}

export async function readCachedTranslation(
  word: string,
  language: string,
): Promise<CachedAiTranslation | null> {
  const rows = await sql().query(
    `select words, sense_index
     from public.ai_translations
     where normalized_word = $1 and language = $2 and status = 'done'`,
    [word, language],
  );
  const row = rows[0] as { words: string[]; sense_index: number } | undefined;
  if (!row || row.words.length === 0) return null;
  return { words: row.words, senseIndex: row.sense_index };
}

/** One query for a page of Remembered words instead of one per word. */
export async function readCachedTranslations(
  words: string[],
  language: string,
): Promise<Map<string, CachedAiTranslation>> {
  const result = new Map<string, CachedAiTranslation>();
  if (words.length === 0) return result;

  const rows = await sql().query(
    `select normalized_word, words, sense_index
     from public.ai_translations
     where language = $1 and status = 'done' and normalized_word = any($2::text[])`,
    [language, words],
  );

  for (const row of rows as {
    normalized_word: string;
    words: string[];
    sense_index: number;
  }[]) {
    if (row.words.length > 0) {
      result.set(row.normalized_word, {
        words: row.words,
        senseIndex: row.sense_index,
      });
    }
  }
  return result;
}

/**
 * Atomic claim. Returns true only for the request that owns this generation, so
 * two concurrent readers cannot both call the provider. A row that exhausted
 * its attempts is claimable again once the cooldown has passed, and its counter
 * starts over. `force` skips both guards, for an explicit user action.
 */
async function claim(word: string, language: string, force = false) {
  const rows = await sql().query(
    `insert into public.ai_translations (normalized_word, language, status, attempts, model)
     values ($1, $2, 'pending', 1, $3)
     on conflict (normalized_word, language) do update
       set status = 'pending',
           attempts = case
             when $5::boolean
               then 1
             when public.ai_translations.updated_at
                  < now() - interval '${RETRY_COOLDOWN_INTERVAL}'
               then 1
             else public.ai_translations.attempts + 1
           end,
           model = excluded.model,
           updated_at = now()
       where public.ai_translations.status <> 'done'
         and (
           $5::boolean
           or (
             public.ai_translations.attempts < $4
             and (
               public.ai_translations.status <> 'pending'
               or public.ai_translations.updated_at
                  < now() - interval '${STALE_PENDING_INTERVAL}'
             )
           )
           or public.ai_translations.updated_at
              < now() - interval '${RETRY_COOLDOWN_INTERVAL}'
         )
     returning normalized_word`,
    [word, language, aiModel(), MAX_ATTEMPTS, force],
  );
  return rows.length > 0;
}

async function store(
  word: string,
  language: string,
  result: GeneratedTranslation,
) {
  await sql().query(
    `update public.ai_translations
     set words = $3::text[],
         sense_index = $4,
         confidence = $5,
         prompt_version = $6,
         status = 'done',
         updated_at = now()
     where normalized_word = $1 and language = $2`,
    [
      word,
      language,
      result.words,
      result.senseIndex,
      result.confidence,
      PROMPT_VERSION,
    ],
  );
}

async function markFailed(word: string, language: string) {
  await sql().query(
    `update public.ai_translations
     set status = 'failed', updated_at = now()
     where normalized_word = $1 and language = $2`,
    [word, language],
  );
}

/**
 * Guarantees a translation when one is needed and possible.
 *
 * Order: dictionary data (checked here) → cache → provider. Returns `null` when
 * nothing could be produced, so callers keep their English fallback. Never
 * throws: a provider outage must not break a page render.
 */
export async function ensureTranslation(
  { word, entries }: { word: string; entries: Entry[] },
  language: string,
  { force = false }: { force?: boolean } = {},
): Promise<CachedAiTranslation | null> {
  if (!isAiConfigured()) return null;
  if (language === "en") return null;
  if (hasDictionaryTranslation(entries, language)) return null;

  const normalized = word.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const cached = await readCachedTranslation(normalized, language);
    if (cached) return cached;

    if (!(await claim(normalized, language, force))) return null;

    const result = await generate({ word: normalized, entries, language });
    if (!result) {
      // The provider answered but the reply was unusable: truncated, not JSON,
      // or below the confidence floor. Worth a line, unlike a plain outage.
      console.warn(
        `AI translation unusable for "${normalized}" (${language}).`,
      );
      await markFailed(normalized, language);
      return null;
    }

    await store(normalized, language, result);
    return { words: result.words, senseIndex: result.senseIndex };
  } catch (error) {
    // A provider timeout is an expected fallback, not a bug: one line is
    // enough, and the stack only helps when something unexpected broke.
    if (error instanceof AiUnavailableError) {
      console.warn(
        `AI translation unavailable for "${normalized}" (${language}): ${error.message}`,
      );
    } else {
      console.error(
        `AI translation failed for "${normalized}" (${language}).`,
        error,
      );
    }
    try {
      await markFailed(normalized, language);
    } catch {
      // The row may not exist yet; nothing else to do.
    }
    return null;
  }
}
