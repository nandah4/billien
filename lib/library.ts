import type { DictionaryEntry, DictionaryMeaning, SavedWord } from "@/lib/types";

export type PosBucket = "noun" | "verb" | "adjective" | "other";
export type FilterId = "all" | PosBucket;
export type View = "discovery" | "remembered";

export type LibraryWord = {
  key: string;
  word: string;
  phonetic: string | null;
  meanings: DictionaryMeaning[];
  savedWord: SavedWord | null;
};

export type FilterOption = {
  id: FilterId;
  label: string;
  count: number;
};

export const PAGE_SIZE = 8;
export const DRILL_SIZE = 5;

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function posBucket(partOfSpeech?: string): PosBucket {
  const value = (partOfSpeech ?? "").toLowerCase();
  if (value.startsWith("noun")) return "noun";
  if (value.startsWith("verb")) return "verb";
  if (value.startsWith("adjective")) return "adjective";
  return "other";
}

export function primaryDefinition(word: { meanings?: DictionaryMeaning[] }) {
  return word.meanings?.[0]?.definitions?.[0]?.definition?.trim() ?? null;
}

export function isSavedWord(word: SavedWord | DictionaryEntry): word is SavedWord {
  return "id" in word;
}

/** Counts are scoped to the active view, so the chips always match the list. */
export function buildFilters(items: LibraryWord[]): FilterOption[] {
  const counts: Record<PosBucket, number> = {
    noun: 0,
    verb: 0,
    adjective: 0,
    other: 0,
  };
  for (const item of items) {
    counts[posBucket(item.meanings[0]?.partOfSpeech)] += 1;
  }
  return [
    { id: "all", label: "All", count: items.length },
    { id: "verb", label: "Verbs", count: counts.verb },
    { id: "adjective", label: "Adjectives", count: counts.adjective },
    { id: "noun", label: "Nouns", count: counts.noun },
  ];
}

export function filterItems(
  items: LibraryWord[],
  { query, filter }: { query: string; filter: FilterId },
) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (needle && !item.word.toLowerCase().includes(needle)) return false;
    if (filter === "all") return true;
    return posBucket(item.meanings[0]?.partOfSpeech) === filter;
  });
}

/** Clamps the requested page so a shrinking list never shows a blank page. */
export function paginate<T>(items: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), pageCount);
  return {
    pageCount,
    currentPage,
    pageItems: items.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    ),
  };
}
