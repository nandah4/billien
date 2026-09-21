export type DictionaryPhonetic = {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: { name?: string; url?: string };
};

export type DictionaryDefinition = {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryEntry = {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license?: { name?: string; url?: string };
  sourceUrls?: string[];
  [key: string]: unknown;
};

export type SavedWord = {
  id: string;
  word: string;
  normalized_word: string;
  phonetic: string | null;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license: { name?: string; url?: string } | null;
  source_urls: string[];
  api_entries: DictionaryEntry[];
  added_at: string;
  last_reviewed_at: string | null;
  review_count: number;
  remembered_count: number;
  forgotten_count: number;
};

export type StreakDay = {
  activity_date: string;
  learned_count: number;
  review_count: number;
};

export type DiscoveryWord = {
  word: string;
  score: number;
};

export type DiscoverPage = {
  items: DiscoveryWord[];
  nextCursor: string | null;
  hasMore: boolean;
};
