import type { Entry, SavedWord } from "@/lib/types";

export type PosBucket = "noun" | "verb" | "adjective" | "other";
export type FilterId = "all" | PosBucket;
export type SortId = "recent" | "az" | "reviews";
export type View = "discovery" | "remembered";

export type LibraryWord = {
  key: string;
  word: string;
  phonetic: string | null;
  entries: Entry[];
  /** Preferred-language translations, only populated for remembered words. */
  translation: string[];
  savedWord: SavedWord | null;
};

export type FilterOption = {
  id: FilterId;
  label: string;
  count: number;
};

export const PAGE_SIZE = 8;
export const DRILL_SIZE = 5;

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "recent", label: "Terbaru" },
  { id: "az", label: "A–Z" },
  { id: "reviews", label: "Paling sering di-review" },
];

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function entryPartOfSpeech(word: { entries?: Entry[] }) {
  return word.entries?.[0]?.partOfSpeech?.trim() || null;
}

export function posBucket(partOfSpeech?: string | null): PosBucket {
  const value = (partOfSpeech ?? "").toLowerCase();
  if (value.startsWith("noun")) return "noun";
  if (value.startsWith("verb")) return "verb";
  if (value.startsWith("adjective")) return "adjective";
  return "other";
}

export function primaryDefinition(word: { entries?: Entry[] }) {
  for (const entry of word.entries ?? []) {
    for (const sense of entry.senses ?? []) {
      const definition = sense.definition?.trim();
      if (definition) return definition;
    }
  }
  return null;
}

export function flattenTranslations(
  translations: Record<string, string[]> | undefined,
  language: string,
  limit = 4,
) {
  return (translations?.[language] ?? []).slice(0, limit);
}

export function isSavedWord(
  word: SavedWord | { word: string },
): word is SavedWord {
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
    counts[posBucket(entryPartOfSpeech(item))] += 1;
  }
  return [
    { id: "all", label: "All", count: items.length },
    { id: "verb", label: "Verbs", count: counts.verb },
    { id: "adjective", label: "Adjectives", count: counts.adjective },
    { id: "noun", label: "Nouns", count: counts.noun },
  ];
}

/**
 * Matches the English headword and the preferred-language translation, so
 * searching `halo` finds `hello` in Remembered.
 */
export function filterItems(
  items: LibraryWord[],
  { query, filter }: { query: string; filter: FilterId },
) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (needle) {
      const matchesWord = item.word.toLowerCase().includes(needle);
      const matchesTranslation = item.translation.some((word) =>
        word.toLowerCase().includes(needle),
      );
      if (!matchesWord && !matchesTranslation) return false;
    }
    if (filter === "all") return true;
    return posBucket(entryPartOfSpeech(item)) === filter;
  });
}

export function sortItems(items: LibraryWord[], sort: SortId) {
  const copy = [...items];
  if (sort === "az") {
    return copy.sort((a, b) => a.word.localeCompare(b.word));
  }
  if (sort === "reviews") {
    return copy.sort(
      (a, b) =>
        (b.savedWord?.review_count ?? 0) - (a.savedWord?.review_count ?? 0),
    );
  }
  return copy.sort((a, b) =>
    (b.savedWord?.added_at ?? "").localeCompare(a.savedWord?.added_at ?? ""),
  );
}

export function distinctPartsOfSpeech(entries: Entry[], limit = 3) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const part = entry.partOfSpeech?.trim();
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
    if (out.length >= limit) break;
  }
  return out;
}

export function collectTags(
  entries: Entry[],
  kind: "synonyms" | "antonyms",
  limit = 6,
) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    for (const sense of entry.senses ?? []) {
      for (const value of sense[kind] ?? []) {
        const tag = value?.trim();
        if (!tag) continue;
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tag);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function collectExamples(entries: Entry[], limit = 3) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    for (const sense of entry.senses ?? []) {
      for (const value of sense.examples ?? []) {
        const example = value?.trim();
        if (!example) continue;
        const key = example.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(example);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function collectForms(entries: Entry[], limit = 12) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    for (const form of entry.forms ?? []) {
      const word = form.word?.trim();
      if (!word) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(word);
      if (out.length >= limit) return out;
    }
  }
  return out;
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
