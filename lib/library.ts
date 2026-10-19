import type { Entry, SavedWord, WordForm } from "@/lib/types";
import { parseFormOf } from "./word-forms.ts";

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

export type FormGroup = {
  partOfSpeech: string;
  forms: WordForm[];
};

/**
 * Forms grouped by the part of speech that produces them, deduplicated across
 * entries. The tags are kept so the UI can say *which* form a chip is.
 */
export function collectFormGroups(entries: Entry[], limit = 12): FormGroup[] {
  const groups: FormGroup[] = [];
  const positions = new Map<string, number>();
  const seen = new Set<string>();
  let total = 0;

  for (const entry of entries) {
    const partOfSpeech = entry.partOfSpeech?.trim() ?? "";
    for (const form of entry.forms ?? []) {
      const word = form.word?.trim();
      if (!word) continue;

      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const groupKey = partOfSpeech.toLowerCase();
      let position = positions.get(groupKey);
      if (position === undefined) {
        position = groups.length;
        positions.set(groupKey, position);
        groups.push({ partOfSpeech, forms: [] });
      }
      groups[position].forms.push({ word, tags: form.tags ?? [] });

      total += 1;
      if (total >= limit) return groups;
    }
  }

  return groups;
}

export type SenseMeaning = {
  partOfSpeech: string;
  definition: string;
  words: string[];
  example: string | null;
  source?: "ai";
};

/**
 * One row per sense, never merged by part of speech: two noun senses of `run`
 * mean different things. A form-of gloss is a grammatical relation rather than
 * a meaning, so it is skipped here; the lemma carries the real senses.
 *
 * Senses with a translation come first so the first three rows are useful.
 */
export function senseMeanings(
  entries: Entry[],
  language: string,
  {
    limitPerSense = 4,
    limit = 20,
  }: { limitPerSense?: number; limit?: number } = {},
): SenseMeaning[] {
  const out: SenseMeaning[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    for (const sense of entry.senses ?? []) {
      const definition = sense.definition?.trim() ?? "";
      if (definition && parseFormOf(definition)) continue;

      const words = (sense.translations[language] ?? [])
        .filter(Boolean)
        .slice(0, limitPerSense);
      if (words.length === 0 && !definition) continue;

      const key = `${entry.partOfSpeech}|${definition}|${words.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        partOfSpeech: entry.partOfSpeech,
        definition,
        words,
        example: sense.examples?.[0]?.trim() || null,
        source: sense.translationSource,
      });
    }
  }

  const translated = out.filter((meaning) => meaning.words.length > 0);
  const rest = out.filter((meaning) => meaning.words.length === 0);
  return [...translated, ...rest].slice(0, limit);
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
