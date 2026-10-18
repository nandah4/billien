import type { Entry, Sense } from "@/lib/types";
import { shuffle } from "./random.ts";
import type {
  RecallCard,
  RecallMode,
  RecallPrompt,
  RecallWord,
} from "./types.ts";

/** Modes tried, in order, when the caller asks for `auto`. */
export const AUTO_MODES: RecallMode[] = ["translation", "definition", "cloze"];

const MAX_PROMPT_WORDS = 4;
const CLOZE_BLANK = "_____";
const MIN_CLOZE_WORDS = 4;
const CHOICE_OPTIONS = 4;

function allSenses(entries: Entry[]): Sense[] {
  return entries.flatMap((entry) => entry.senses ?? []);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A definition that contains the headword would print the answer, so it is
 * dropped rather than shown as a prompt.
 */
function leaksWord(text: string, word: string): boolean {
  if (!text.trim() || !word.trim()) return false;
  return new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, "i").test(text);
}

function safeDefinition(sense: Sense, word: string): string | null {
  const definition = sense.definition?.trim();
  if (!definition) return null;
  return leaksWord(definition, word) ? null : definition;
}

/** Every meaning the word has in one language, deduplicated. */
export function meaningsFor(
  source: { translations: Record<string, string[]>; entries: Entry[] },
  language: string,
): string[] {
  const direct = (source.translations[language] ?? []).filter(Boolean);
  if (direct.length > 0) return Array.from(new Set(direct));

  for (const sense of allSenses(source.entries)) {
    const words = (sense.translations[language] ?? []).filter(Boolean);
    if (words.length > 0) return Array.from(new Set(words));
  }
  return [];
}

/**
 * Builds a cloze sentence from the first example that contains the headword
 * exactly once. Ambiguous sentences (the word appears twice) and very short
 * ones are skipped, because either makes the blank guessable or unclear.
 */
export function buildCloze(source: {
  word: string;
  entries: Entry[];
}): { sentence: string; definition: string | null } | null {
  const word = source.word.trim();
  if (!word) return null;

  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");

  for (const sense of allSenses(source.entries)) {
    for (const example of sense.examples ?? []) {
      const matches = example.match(pattern);
      if (!matches || matches.length !== 1) continue;

      const sentence = example.replace(pattern, CLOZE_BLANK).trim();
      if (sentence.split(/\s+/).filter(Boolean).length < MIN_CLOZE_WORDS)
        continue;

      return {
        sentence,
        definition: safeDefinition(sense, word),
      };
    }
  }

  return null;
}

/** Length and initial letter only, never the rest of the word. */
export function buildHint(word: string): { length: number; initial: string } {
  const letters = word.replace(/[^\p{L}]/gu, "");
  return {
    length: letters.length,
    initial: (letters[0] ?? "").toLowerCase(),
  };
}

/**
 * Picks the prompt for one mode, or `null` when the word cannot support it.
 * `choice` needs options from other words, so it is built by `buildCard`.
 */
export function buildPrompt(
  source: RecallWord,
  language: string,
  mode: RecallMode,
): RecallPrompt | null {
  if (mode === "choice") return null;

  if (mode === "translation") {
    for (const sense of allSenses(source.entries)) {
      const words = (sense.translations[language] ?? []).filter(Boolean);
      if (words.length === 0) continue;
      return {
        kind: "translation",
        language,
        words: words.slice(0, MAX_PROMPT_WORDS),
        definition: safeDefinition(sense, source.word),
      };
    }

    // The word-level aggregate still gives a usable prompt when no single sense
    // carries the translation.
    const words = meaningsFor(source, language);
    if (words.length === 0) return null;
    return {
      kind: "translation",
      language,
      words: words.slice(0, MAX_PROMPT_WORDS),
      definition: allSenses(source.entries)[0]
        ? safeDefinition(allSenses(source.entries)[0], source.word)
        : null,
    };
  }

  if (mode === "definition") {
    for (const sense of allSenses(source.entries)) {
      const definition = safeDefinition(sense, source.word);
      if (definition) return { kind: "definition", language, definition };
    }
    return null;
  }

  const cloze = buildCloze(source);
  if (!cloze) return null;
  return {
    kind: "cloze",
    language,
    sentence: cloze.sentence,
    definition: cloze.definition,
  };
}

/** The first mode the word can support, in `auto` order. */
export function pickMode(
  source: RecallWord,
  language: string,
  allowed: RecallMode[] = AUTO_MODES,
): RecallMode | null {
  for (const mode of allowed) {
    if (mode === "choice") continue;
    if (buildPrompt(source, language, mode)) return mode;
  }
  return null;
}

export function isEligible(source: RecallWord, language: string): boolean {
  return pickMode(source, language) !== null;
}

export type DistractorCandidate = {
  id: string;
  word: string;
  partOfSpeech: string;
  translations: Record<string, string[]>;
  entries: Entry[];
};

/**
 * Picks three other meanings for a `choice` card. Candidates that share any
 * meaning with the target are dropped so no option is accidentally correct;
 * words with the same part of speech are preferred. Returns `null` when there
 * are not enough clean candidates, and the caller falls back to typing.
 */
export function pickDistractors(
  target: RecallWord,
  pool: DistractorCandidate[],
  language: string,
  rng: () => number = Math.random,
): DistractorCandidate[] | null {
  const targetMeanings = new Set(meaningsFor(target, language));
  if (targetMeanings.size === 0) return null;

  const clean = pool.filter((candidate) => {
    if (candidate.id === target.id) return false;
    const meanings = meaningsFor(candidate, language);
    if (meanings.length === 0) return false;
    return !meanings.some((meaning) => targetMeanings.has(meaning));
  });

  if (clean.length < CHOICE_OPTIONS - 1) return null;

  const targetPos = target.entries[0]?.partOfSpeech ?? "";
  const samePos = clean.filter(
    (candidate) => (candidate.entries[0]?.partOfSpeech ?? "") === targetPos,
  );
  const otherPos = clean.filter(
    (candidate) => (candidate.entries[0]?.partOfSpeech ?? "") !== targetPos,
  );

  return shuffle(samePos, rng)
    .concat(shuffle(otherPos, rng))
    .slice(0, CHOICE_OPTIONS - 1);
}

/**
 * Builds one card. Returns `null` when the requested mode is impossible and no
 * fallback exists, which is how a word is excluded from the session.
 */
export function buildCard(
  source: RecallWord,
  language: string,
  requested: RecallMode | "auto" = "auto",
  pool: DistractorCandidate[] = [],
  rng: () => number = Math.random,
): RecallCard | null {
  const partOfSpeech = source.entries[0]?.partOfSpeech ?? "unknown";
  const stats = {
    recallStreak: source.recallStreak,
    lapses: source.recallLapses,
    reviewCount: source.reviewCount,
  };
  const hint = buildHint(source.word);

  if (requested === "choice") {
    const picked = pickDistractors(source, pool, language, rng);
    const targetMeanings = meaningsFor(source, language);
    if (picked && targetMeanings.length > 0) {
      const options = shuffle(
        [
          { id: source.id, label: targetMeanings[0] },
          ...picked.map((candidate) => ({
            id: candidate.id,
            label: meaningsFor(candidate, language)[0],
          })),
        ],
        rng,
      );
      return {
        id: source.id,
        mode: "choice",
        partOfSpeech,
        prompt: {
          kind: "choice",
          language,
          word: source.word,
          phonetic: source.phonetic,
          options,
        },
        hint,
        stats,
      };
    }
  }

  const mode =
    requested === "auto" || requested === "choice"
      ? pickMode(source, language)
      : requested;
  if (!mode) return null;

  const prompt = buildPrompt(source, language, mode);
  if (!prompt) return null;

  return { id: source.id, mode, partOfSpeech, prompt, hint, stats };
}
