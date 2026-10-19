import type { Entry, FormKind, FormOf } from "./types.ts";

/**
 * Wiktionary states an inflection as a definition rather than as structured
 * data: `simple past of run`, `plural of child`, `third-person singular simple
 * present indicative of box`. Parsing that gloss is deterministic and covers
 * irregulars (`went`, `mice`) without a morphology dependency.
 *
 * This module is pure: no IO and no `server-only`, so the detail panel can use
 * it to keep a form-of gloss out of the meanings list.
 */

const LEADING_PARENTHETICAL = /^\([^)]*\)\s*/;
const TRAILING_PUNCTUATION = /[.;,]+$/;

/** Descriptor → kind. The most specific patterns must come first. */
const DESCRIPTORS: [RegExp, FormKind][] = [
  [/^(?:simple |plain )?past and past participle$/, "past"],
  [/^(?:simple )?past participle$/, "past-participle"],
  [/^(?:simple )?past(?: tense)?$/, "past"],
  [/^present participle(?: and gerund)?$/, "present-participle"],
  [/^gerund(?: and present participle)?$/, "present-participle"],
  [
    /^third[- ]person singular(?: (?:simple )?present(?: indicative)?)?$/,
    "third-person",
  ],
  [/^plural(?: form)?$/, "plural"],
  [/^comparative(?: degree| form)?$/, "comparative"],
  [/^superlative(?: degree| form)?$/, "superlative"],
  [/^comparative and superlative(?: degree| form)?$/, "comparative"],
];

const LABELS: Record<FormKind, string> = {
  past: "Past tense",
  "past-participle": "Past participle",
  "present-participle": "Present participle",
  plural: "Plural",
  "third-person": "Third-person singular",
  comparative: "Comparative",
  superlative: "Superlative",
  form: "Form",
};

export function formKindLabel(kind: FormKind): string {
  return LABELS[kind] ?? LABELS.form;
}

/**
 * Removes the decorations a gloss may carry: a leading register note
 * (`(nonstandard) past participle of go`), a trailing note
 * (`leave (“depart, separate from…”)`), or a qualifier (`well: more well`).
 */
function stripDecorations(value: string): string {
  let text = value.trim();
  while (LEADING_PARENTHETICAL.test(text)) {
    text = text.replace(LEADING_PARENTHETICAL, "").trim();
  }

  let cut = text.length;
  for (const marker of ["(", ":"]) {
    const index = text.indexOf(marker);
    if (index !== -1 && index < cut) cut = index;
  }

  return text.slice(0, cut).trim().replace(TRAILING_PUNCTUATION, "");
}

/**
 * `comparative degree of good and well` names two lemmas; the first is the
 * primary one. Phrasal lemmas (`give up`) are kept whole so the label can still
 * read correctly even though they cannot be looked up.
 */
function cleanLemma(value: string): string | null {
  let text = value.trim();
  const conjunction = text.indexOf(" and ");
  if (conjunction > 0) text = text.slice(0, conjunction);

  text = text
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(TRAILING_PUNCTUATION, "")
    .trim()
    .toLowerCase();

  if (!text) return null;
  if (!/^[a-z][a-z'’\-]*(?:\s+[a-z][a-z'’\-]*)*$/.test(text)) return null;
  return text;
}

/** Parses one definition into a lemma relation, or `null` when it is a sense. */
export function parseFormOf(definition: string): FormOf | null {
  const text = stripDecorations(definition);
  if (!text) return null;

  const separator = text.indexOf(" of ");
  if (separator <= 0) return null;

  const descriptor = text.slice(0, separator).trim().toLowerCase();
  const rest = text.slice(separator + 4).trim();

  const match = DESCRIPTORS.find(([pattern]) => pattern.test(descriptor));
  if (!match) return null;

  const lemma = cleanLemma(rest);
  if (!lemma) return null;

  return { kind: match[1], lemma };
}

/**
 * Reads the relation from the word's **primary** entry only. A single real
 * definition there means the word stands on its own: `saw` (the tool) must not
 * be read as the past of `see`, even though another entry says so.
 */
export function detectFormOfGloss(
  entries: Entry[],
  word?: string,
): FormOf | null {
  const primary = entries[0];
  if (!primary || primary.senses.length === 0) return null;

  let detected: FormOf | null = null;
  for (const sense of primary.senses) {
    const definition = sense.definition?.trim() ?? "";
    if (!definition) continue;

    const parsed = parseFormOf(definition);
    if (!parsed) return null;
    detected ??= parsed;
  }

  if (!detected) return null;
  if (word && detected.lemma === word.trim().toLowerCase()) return null;
  return detected;
}

export type FormCandidate = {
  word: string;
  kind: FormKind;
};

const MIN_CANDIDATE_LENGTH = 2;
const CANDIDATE_PATTERN = /^[a-z][a-z'’\-]*$/;

/** A doubled final consonant is how English protects a short vowel: `runn(ing)`. */
function undouble(stem: string): string {
  const last = stem.at(-1) ?? "";
  return last && stem.at(-2) === last ? stem.slice(0, -1) : stem;
}

/**
 * Suffix rules, ordered most-likely first. They only ever produce candidates;
 * the caller must confirm one in the dictionary before treating it as a lemma,
 * which is what keeps `walked → walk` and rejects `zzzed → zzz`.
 */
export function suffixCandidates(rawWord: string): FormCandidate[] {
  const word = rawWord.trim().toLowerCase();
  if (!CANDIDATE_PATTERN.test(word)) return [];

  const out: FormCandidate[] = [];
  const seen = new Set<string>([word]);
  const add = (candidate: string, kind: FormKind) => {
    const value = candidate.trim().toLowerCase();
    if (value.length < MIN_CANDIDATE_LENGTH) return;
    if (!CANDIDATE_PATTERN.test(value)) return;
    if (seen.has(value)) return;
    seen.add(value);
    out.push({ word: value, kind });
  };

  if (word.endsWith("ies") && word.length > 4) {
    add(`${word.slice(0, -3)}y`, "plural");
  }
  if (word.endsWith("ied") && word.length > 4) {
    add(`${word.slice(0, -3)}y`, "past");
  }
  if (word.endsWith("es") && word.length > 3) {
    add(word.slice(0, -2), "plural");
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 2) {
    add(word.slice(0, -1), "plural");
  }
  if (word.endsWith("ed") && word.length > 3) {
    add(word.slice(0, -2), "past");
    add(undouble(word.slice(0, -2)), "past");
    add(word.slice(0, -1), "past");
  }
  if (word.endsWith("ing") && word.length > 4) {
    add(word.slice(0, -3), "present-participle");
    add(undouble(word.slice(0, -3)), "present-participle");
    add(`${word.slice(0, -3)}e`, "present-participle");
  }
  if (word.endsWith("iest") && word.length > 5) {
    add(`${word.slice(0, -4)}y`, "superlative");
  }
  if (word.endsWith("est") && word.length > 4) {
    add(undouble(word.slice(0, -3)), "superlative");
    add(word.slice(0, -3), "superlative");
    add(word.slice(0, -2), "superlative");
  }
  if (word.endsWith("ier") && word.length > 4) {
    add(`${word.slice(0, -3)}y`, "comparative");
  }
  if (word.endsWith("er") && word.length > 3) {
    add(undouble(word.slice(0, -2)), "comparative");
    add(word.slice(0, -2), "comparative");
    add(word.slice(0, -1), "comparative");
  }

  return out;
}
