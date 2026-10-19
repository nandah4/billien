import type { Entry, SavedWord } from "@/lib/types";

export type SortId = "recent" | "az" | "reviews";

export type LibraryWord = {
  key: string;
  word: string;
  phonetic: string | null;
  entries: Entry[];
  /** Preferred-language translations, only populated for remembered words. */
  translation: string[];
  savedWord: SavedWord | null;
};

export const PAGE_SIZE = 8;

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "recent", label: "Newest" },
  { id: "az", label: "A–Z" },
  { id: "reviews", label: "Most reviewed" },
];

/** Alphabetical by default: a saved-word list is a reference, not a feed. */
export const DEFAULT_SORT: SortId = "az";

/** Bucket used for words that do not start with a latin letter. */
export const OTHER_LETTER = "#";

/** Every letter the filter offers, in order. */
export const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * The letter a word files under. Accents and case are folded first, so `Étude`
 * and `étude` land in the same place; anything else collects under `#`.
 */
export function letterOf(word: string): string {
  const first = word
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .charAt(0)
    .toLowerCase();
  return /^[a-z]$/.test(first) ? first : OTHER_LETTER;
}

/** Letters present in the library, alphabetical with `#` last. */
export function availableLetters(items: LibraryWord[]): string[] {
  const seen = new Set<string>();
  for (const item of items) seen.add(letterOf(item.word));
  return [...seen].sort((a, b) => {
    if (a === OTHER_LETTER) return 1;
    if (b === OTHER_LETTER) return -1;
    return a.localeCompare(b);
  });
}

/** `null` means every letter. */
export function filterByLetter(items: LibraryWord[], letter: string | null) {
  if (!letter) return items;
  return items.filter((item) => letterOf(item.word) === letter);
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function entryPartOfSpeech(word: { entries?: Entry[] }) {
  return word.entries?.[0]?.partOfSpeech?.trim() || null;
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

/**
 * Matches the English headword and the preferred-language translation, so
 * searching `halo` finds `hello` in Remembered.
 */
export function searchItems(items: LibraryWord[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    if (item.word.toLowerCase().includes(needle)) return true;
    return item.translation.some((word) => word.toLowerCase().includes(needle));
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

export type TranslationGroup = {
  partOfSpeech: string;
  words: string[];
  source?: "ai";
};

/**
 * Groups translations by part of speech so the detail panel never repeats the
 * same `NOUN` label for every sense. Words are deduplicated within a group and
 * capped per group to keep the block scannable.
 */
export function translationGroups(
  entries: Entry[],
  language: string,
  limitPerGroup = 6,
) {
  const groups: TranslationGroup[] = [];
  const index = new Map<string, number>();

  for (const entry of entries) {
    for (const sense of entry.senses) {
      const words = sense.translations[language];
      if (!words || words.length === 0) continue;

      const key = entry.partOfSpeech.trim().toLowerCase();
      const existing = index.get(key);

      if (existing === undefined) {
        index.set(key, groups.length);
        groups.push({
          partOfSpeech: entry.partOfSpeech,
          words: words.slice(0, limitPerGroup),
          source: sense.translationSource,
        });
        continue;
      }

      const group = groups[existing];
      for (const word of words) {
        if (group.words.length >= limitPerGroup) break;
        if (
          group.words.some((item) => item.toLowerCase() === word.toLowerCase())
        ) {
          continue;
        }
        group.words.push(word);
      }
      if (sense.translationSource === "ai") group.source = "ai";
    }
  }

  return groups;
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
