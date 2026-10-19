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

/** The grammatical relation between an inflected word and its lemma. */
export type FormKind =
  | "past"
  | "past-participle"
  | "present-participle"
  | "plural"
  | "third-person"
  | "comparative"
  | "superlative"
  | "form";

export type FormOf = {
  kind: FormKind;
  lemma: string;
};

/**
 * The lemma of a form word, resolved at read time. It is never stored: the
 * relation is derived from the entries, so no schema change is needed.
 */
export type LemmaResult = {
  word: string;
  entries: Entry[];
  source: DictionarySource | null;
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
  /** Set when the headword is an inflected form of another word. */
  formOf?: FormOf | null;
  /** Entries of `formOf.lemma`, so meanings come from the lemma. */
  lemma?: LemmaResult | null;
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
  /** Derived on read; never persisted. */
  formOf?: FormOf | null;
  /** Derived on read; never persisted. */
  lemma?: LemmaResult | null;
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
  /** `YYYY-MM-DD`, as text. The driver would turn a `date` into a `Date`. */
  activity_date: string;
  learned_count: number;
  review_count: number;
};

/** What a row can look like before normalisation, e.g. straight from a driver. */
export type StreakDayInput = {
  activity_date: string | Date;
  learned_count: number;
  review_count: number;
};
