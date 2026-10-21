import type {
  DictionaryResult,
  DictionarySource,
  Entry,
  Pronunciation,
  Sense,
  WordForm,
} from "./types";

/**
 * Caps measured against the real provider payload: `hello` returns 96 KB /
 * 1,341 translation rows and `run` returns 69 senses. Twelve senses keep the
 * translated senses of a polysemous verb reachable without doubling the row.
 */
export const MAX_SENSES_PER_ENTRY = 12;
export const MAX_TRANSLATIONS_PER_LANGUAGE = 3;
export const MAX_GLOBAL_TRANSLATIONS_PER_LANGUAGE = 8;
export const MAX_EXAMPLES = 5;
export const MAX_FORMS = 12;
export const MAX_PRONUNCIATIONS = 6;
export const MAX_TAGS = 12;

const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
/** Wiktionary emits parser scaffolding as "forms"; it is not a word form. */
const NOISE_FORM_TAGS = new Set(["table-tags", "inflection-template"]);
/**
 * A form of a phrase is itself a phrase (`give up` → `gives up`, `gave up`), so
 * spaces are allowed between words; anything else stays a single token.
 */
const WORD_FORM = /^[a-z][a-z'’\-]*(?: [a-z][a-z'’\-]*)*$/i;

export type RawDictionary = {
  word?: unknown;
  entries?: unknown;
  source?: unknown;
};

export type NormalizedDictionary = {
  word: string;
  normalized_word: string;
  phonetic: string | null;
  entries: Entry[];
  translations: Record<string, string[]>;
  forms: WordForm[];
  source: DictionarySource | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = asText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeTranslations(
  value: unknown,
  limitPerLanguage: number,
): Record<string, string[]> {
  if (!Array.isArray(value)) return {};
  const map: Record<string, string[]> = {};
  const seen = new Map<string, Set<string>>();
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const language = asRecord(record.language);
    const code = asText(language?.code).toLowerCase();
    const word = asText(record.word);
    if (!code || !LANGUAGE_CODE.test(code) || !word) continue;
    const bucket = map[code] ?? (map[code] = []);
    if (bucket.length >= limitPerLanguage) continue;
    const seenSet = seen.get(code) ?? new Set<string>();
    seen.set(code, seenSet);
    const key = word.toLowerCase();
    if (seenSet.has(key)) continue;
    seenSet.add(key);
    bucket.push(word);
  }
  return map;
}

function normalizePronunciations(value: unknown): Pronunciation[] {
  if (!Array.isArray(value)) return [];
  const out: Pronunciation[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const text = asText(record.text);
    if (!text) continue;
    out.push({
      type: asText(record.type) || "ipa",
      text,
      tags: asStringList(record.tags, 6),
    });
    if (out.length >= MAX_PRONUNCIATIONS) break;
  }
  return out;
}

function normalizeForms(value: unknown, limit: number): WordForm[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: WordForm[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const word = asText(record.word);
    if (!word || !WORD_FORM.test(word)) continue;
    const tags = asStringList(record.tags, 6);
    if (tags.some((tag) => NOISE_FORM_TAGS.has(tag.toLowerCase()))) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, tags });
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeSense(value: unknown): Sense | null {
  const record = asRecord(value);
  if (!record) return null;
  const translations = normalizeTranslations(
    record.translations,
    MAX_TRANSLATIONS_PER_LANGUAGE,
  );
  const definition = asText(record.definition);
  // A sense with neither a definition nor a translation adds nothing to the UI.
  if (!definition && Object.keys(translations).length === 0) return null;
  return {
    definition,
    tags: asStringList(record.tags, MAX_TAGS),
    examples: asStringList(record.examples, MAX_EXAMPLES),
    synonyms: asStringList(record.synonyms, MAX_TAGS),
    antonyms: asStringList(record.antonyms, MAX_TAGS),
    translations,
  };
}

function normalizeEntry(value: unknown): Entry | null {
  const record = asRecord(value);
  if (!record) return null;

  const senses: Sense[] = [];
  if (Array.isArray(record.senses)) {
    for (const rawSense of record.senses) {
      // `subsenses` are recursive and would explode the payload; they are
      // deliberately ignored here.
      const sense = normalizeSense(rawSense);
      if (sense) senses.push(sense);
      if (senses.length >= MAX_SENSES_PER_ENTRY) break;
    }
  }

  const entry: Entry = {
    partOfSpeech: asText(record.partOfSpeech),
    pronunciations: normalizePronunciations(record.pronunciations),
    forms: normalizeForms(record.forms, MAX_FORMS),
    senses,
  };

  if (
    !entry.partOfSpeech &&
    entry.pronunciations.length === 0 &&
    entry.forms.length === 0 &&
    entry.senses.length === 0
  ) {
    return null;
  }
  return entry;
}

function normalizeSource(value: unknown): DictionarySource | null {
  const record = asRecord(value);
  const url = asText(record?.url);
  if (!url) return null;
  const licenseRecord = asRecord(record?.license);
  const license = licenseRecord
    ? {
        name: asText(licenseRecord.name),
        url: asText(licenseRecord.url),
      }
    : null;
  return {
    url,
    license: license && (license.name || license.url) ? license : null,
  };
}

function mergeTranslations(
  target: Record<string, string[]>,
  source: Record<string, string[]>,
) {
  for (const [code, words] of Object.entries(source)) {
    const bucket = target[code] ?? (target[code] = []);
    const seen = new Set(bucket.map((word) => word.toLowerCase()));
    for (const word of words) {
      if (bucket.length >= MAX_GLOBAL_TRANSLATIONS_PER_LANGUAGE) break;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      bucket.push(word);
    }
  }
}

function mergeForms(target: WordForm[], source: WordForm[]) {
  const seen = new Set(target.map((form) => form.word.toLowerCase()));
  for (const form of source) {
    if (target.length >= MAX_FORMS) break;
    const key = form.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(form);
  }
}

/**
 * Turns the provider response into the compact shape stored in
 * `vocabulary_words`. Drops recursive `subsenses`, caps every list, and
 * flattens per-sense translations into `Record<language, words[]>`.
 */
export function normalizeDictionary(raw: RawDictionary): NormalizedDictionary {
  const word = asText(raw.word);
  const entries: Entry[] = [];
  const translations: Record<string, string[]> = {};
  const forms: WordForm[] = [];

  if (Array.isArray(raw.entries)) {
    for (const rawEntry of raw.entries) {
      const entry = normalizeEntry(rawEntry);
      if (!entry) continue;
      entries.push(entry);
      mergeForms(forms, entry.forms);
      for (const sense of entry.senses) {
        mergeTranslations(translations, sense.translations);
      }
    }
  }

  const phonetic =
    entries.flatMap((entry) => entry.pronunciations).find((item) => item.text)
      ?.text ?? null;

  return {
    word,
    normalized_word: word.toLowerCase(),
    phonetic,
    entries,
    translations,
    forms,
    source: normalizeSource(raw.source),
  };
}

function projectEntries(entries: Entry[], language: string): Entry[] {
  return entries.map((entry) => ({
    ...entry,
    senses: entry.senses.map((sense) => {
      const words = sense.translations[language];
      return {
        ...sense,
        translations: words && words.length > 0 ? { [language]: words } : {},
      };
    }),
  }));
}

function projectTranslationMap(
  translations: Record<string, string[]>,
  language: string,
): Record<string, string[]> {
  const words = translations[language];
  return words && words.length > 0 ? { [language]: words } : {};
}

/**
 * Drops every language except `language` (or keeps everything for `all`).
 * Used by list endpoints so a page of eight words stays small.
 */
export function projectDictionary(
  result: DictionaryResult,
  language: string | "all",
): DictionaryResult {
  if (language === "all") return result;
  return {
    ...result,
    entries: projectEntries(result.entries, language),
    lemma: result.lemma
      ? {
          ...result.lemma,
          entries: projectEntries(result.lemma.entries, language),
        }
      : result.lemma,
  };
}

export function projectSavedWord<
  T extends { entries: Entry[]; translations: Record<string, string[]> },
>(word: T, language: string | "all"): T {
  if (language === "all") return word;
  return {
    ...word,
    entries: projectEntries(word.entries, language),
    translations: projectTranslationMap(word.translations, language),
  };
}

/**
 * List responses only need enough to render a row: the first sense and the
 * preferred translation. Everything else stays available in the detail route,
 * which keeps a page of eight words comfortably under the payload budget.
 */
export function projectSavedWordForList<
  T extends { entries: Entry[]; translations: Record<string, string[]> },
>(word: T, language: string | "all"): T {
  if (language === "all") return word;
  const entries = word.entries.map((entry) => ({
    ...entry,
    pronunciations: entry.pronunciations.slice(0, 1),
    forms: entry.forms.slice(0, 1),
    senses: entry.senses.slice(0, 1).map((sense) => {
      const words = sense.translations[language];
      return {
        ...sense,
        tags: [],
        examples: [],
        synonyms: [],
        antonyms: [],
        translations: words && words.length > 0 ? { [language]: words } : {},
      };
    }),
  }));
  return {
    ...word,
    entries,
    translations: projectTranslationMap(word.translations, language),
  };
}
