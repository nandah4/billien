export type DictionaryTranslation = {
  language: { code: string; name: string };
  word: string;
};

export type DictionarySource = {
  url: string;
  license: { name: string; url: string } | null;
};

export type Pronunciation = {
  type: string;
  text: string;
  tags: string[];
};

export type WordForm = {
  word: string;
  tags: string[];
};

export type Sense = {
  definition: string;
  tags: string[];
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  /** Deduplicated words keyed by language code, e.g. `{ id: ["hai", "salam"] }`. */
  translations: Record<string, string[]>;
  /** Set only when `translations` came from the AI fallback, not the dictionary. */
  translationSource?: "ai";
};

export type Entry = {
  partOfSpeech: string;
  pronunciations: Pronunciation[];
  forms: WordForm[];
  senses: Sense[];
};

export type DictionaryResult = {
  word: string;
  entries: Entry[];
  source: DictionarySource | null;
};

/** A word in `vocabulary_words` joined with the current user's review state. */
export type SavedWord = {
  id: string;
  word: string;
  normalized_word: string;
  phonetic: string | null;
  entries: Entry[];
  /** Every language returned by the provider, so the detail panel can switch instantly. */
  translations: Record<string, string[]>;
  forms: WordForm[];
  source: DictionarySource | null;
  added_at: string;
  last_reviewed_at: string | null;
  review_count: number;
  remembered_count: number;
  forgotten_count: number;
};

export type UserPreferences = {
  translationLanguage: string;
  onboardedAt: string | null;
};

export type StreakDay = {
  activity_date: string;
  learned_count: number;
  review_count: number;
};
