import type { Entry, Sense } from "./types";

export const PROMPT_VERSION = 1;
export const MAX_WORDS = 3;
export const MAX_WORD_LENGTH = 40;
export const MIN_CONFIDENCE = 0.6;

export type CachedAiTranslation = {
  words: string[];
  senseIndex: number;
};

export function hasDictionaryTranslation(entries: Entry[], language: string) {
  return entries.some((entry) =>
    entry.senses.some(
      (sense) => (sense.translations[language]?.length ?? 0) > 0,
    ),
  );
}

/** Flattened index of the sense we translate: the first one with a definition. */
export function targetSenseIndex(entries: Entry[]): number | null {
  let index = 0;
  for (const entry of entries) {
    for (const sense of entry.senses) {
      if (sense.definition.trim()) return index;
      index += 1;
    }
  }
  return null;
}

export function targetSense(entries: Entry[]): Sense | null {
  for (const entry of entries) {
    for (const sense of entry.senses) {
      if (sense.definition.trim()) return sense;
    }
  }
  return null;
}

/**
 * Merges a cached AI translation into the entries for one language. Dictionary
 * data is never overwritten; AI output only fills empty senses, and is tagged
 * so the UI can label it.
 */
export function mergeAiTranslation(
  entries: Entry[],
  cached: CachedAiTranslation | null | undefined,
  language: string,
): Entry[] {
  if (!cached || cached.words.length === 0) return entries;
  let index = 0;
  return entries.map((entry) => ({
    ...entry,
    senses: entry.senses.map((sense) => {
      const current = index++;
      if (current !== cached.senseIndex) return sense;
      if ((sense.translations[language]?.length ?? 0) > 0) return sense;
      return {
        ...sense,
        translations: { ...sense.translations, [language]: cached.words },
        translationSource: "ai" as const,
      };
    }),
  }));
}

function stripCodeFence(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1] : text;
}

/** Models sometimes wrap JSON in prose or a code fence; tolerate both. */
export function parseModelJson(text: string): unknown {
  const body = stripCodeFence(text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Rejects anything that is not a short, clean, lowercase translation. The
 * provider is untrusted: it may echo the headword, return a sentence, or emit
 * markup.
 */
export function sanitizeWords(
  raw: unknown,
  { word }: { word: string },
): string[] {
  if (!Array.isArray(raw)) return [];
  const headword = word.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const value = item
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
    if (!value) continue;
    if (value.length > MAX_WORD_LENGTH) continue;
    if (/[\d<>{}[\]\n\r]/.test(value)) continue;
    if (value === headword) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= MAX_WORDS) break;
  }

  return out;
}

export function buildTranslationMessages({
  word,
  partOfSpeech,
  definition,
  languageLabel,
}: {
  word: string;
  partOfSpeech: string;
  definition: string;
  languageLabel: string;
}) {
  const lines = [
    `Translate the English word "${word}"${partOfSpeech ? ` (${partOfSpeech})` : ""} into ${languageLabel}.`,
    definition ? `Sense: "${definition}"` : null,
    'Reply with JSON only, no markdown: {"translations":["..."],"confidence":0.0}',
    `Rules: at most ${MAX_WORDS} common translations, lowercase, single words, no punctuation, no explanation.`,
    "If you are unsure, return an empty array and a confidence below 0.5.",
  ].filter(Boolean);
  return [
    {
      role: "system" as const,
      content:
        "You are a concise bilingual dictionary. You reply with JSON only.",
    },
    { role: "user" as const, content: lines.join("\n") },
  ];
}

export type GeneratedTranslation = {
  words: string[];
  confidence: number;
  senseIndex: number;
};

/** Parses and validates a raw provider reply. Returns null when unusable. */
export function readTranslationReply(
  raw: string,
  { word, senseIndex }: { word: string; senseIndex: number },
): GeneratedTranslation | null {
  const parsed = parseModelJson(raw) as {
    translations?: unknown;
    confidence?: unknown;
  } | null;
  if (!parsed) return null;

  const confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0;
  if (confidence < MIN_CONFIDENCE) return null;

  const words = sanitizeWords(parsed.translations, { word });
  if (words.length === 0) return null;

  return { words, confidence, senseIndex };
}
