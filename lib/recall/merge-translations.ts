import type { RecallWord } from "./types.ts";

/** The part of a cached AI translation that recall needs. */
export type CachedWords = { words: string[] };

/**
 * Adds the cached AI translation to words the dictionary did not translate.
 *
 * Recall builds its prompt from `translations`, so a word whose translation was
 * generated on save still fell back to a definition-only card while the answer
 * sat in the AI cache. Dictionary data always wins; only words with no
 * translation in that language are filled.
 */
export function applyCachedTranslations(
  words: RecallWord[],
  language: string,
  cached: Map<string, CachedWords>,
): RecallWord[] {
  if (language === "en" || cached.size === 0) return words;

  return words.map((word) => {
    if ((word.translations[language]?.length ?? 0) > 0) return word;

    const ai = cached.get(word.word.trim().toLowerCase());
    if (!ai || ai.words.length === 0) return word;

    return {
      ...word,
      translations: { ...word.translations, [language]: ai.words },
    };
  });
}
