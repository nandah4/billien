import { isEligible } from "./cards.ts";
import { shuffle } from "./random.ts";
import type { RecallPos, RecallScope, RecallWord } from "./types.ts";

/**
 * A session needs at least this many eligible words. Below it the Recall tab
 * shows a gate instead of a session, because ten cards drawn from fewer words
 * would repeat the same library every time.
 */
export const MIN_SESSION_SIZE = 10;

/** Sizes the start panel offers, in steps of five. */
const SIZE_STEP = 5;

export const DEFAULT_SESSION_SIZE = MIN_SESSION_SIZE;

/**
 * Clamps a requested session size. Below the minimum it returns the eligible
 * count unchanged, so the caller can decide whether that is a gate; above it,
 * the session never asks for more cards than there are words to build them
 * from.
 */
export function clampLimit(requested: number, eligible: number): number {
  if (eligible < MIN_SESSION_SIZE) return Math.max(0, eligible);
  if (!Number.isFinite(requested)) return DEFAULT_SESSION_SIZE;
  return Math.max(MIN_SESSION_SIZE, Math.min(Math.trunc(requested), eligible));
}

/**
 * Sizes the UI may offer: ten, then every five, ending with the exact eligible
 * count. `[10, 15, 20, 25, 30, 31]` for 31 words.
 */
export function sizeOptions(eligible: number): number[] {
  if (eligible < MIN_SESSION_SIZE) return [];

  const options: number[] = [];
  for (let size = MIN_SESSION_SIZE; size <= eligible; size += SIZE_STEP) {
    options.push(size);
  }
  if (options.at(-1) !== eligible) options.push(eligible);
  return options;
}

export function posBucket(
  partOfSpeech: string | undefined,
): Exclude<RecallPos, "all"> {
  switch ((partOfSpeech ?? "").toLowerCase()) {
    case "noun":
      return "noun";
    case "verb":
      return "verb";
    case "adjective":
      return "adjective";
    default:
      return "other";
  }
}

/** Never practised counts as due, so no backfill is needed. */
export function isDue(word: RecallWord, now: Date = new Date()): boolean {
  if (!word.recallDueAt) return true;
  const due = Date.parse(word.recallDueAt);
  return Number.isNaN(due) ? true : due <= now.getTime();
}

function dueValue(word: RecallWord): number {
  if (!word.recallDueAt) return Number.NEGATIVE_INFINITY;
  const due = Date.parse(word.recallDueAt);
  return Number.isNaN(due) ? Number.NEGATIVE_INFINITY : due;
}

/**
 * Shuffles first, then sorts by the scope's key. A stable sort keeps the
 * shuffle as the tie-breaker, so equal-priority words never repeat in the same
 * order on every session.
 */
export function orderQueue(
  words: RecallWord[],
  scope: RecallScope,
  rng: () => number = Math.random,
): RecallWord[] {
  const shuffled = shuffle(words, rng);

  if (scope === "weak") {
    return shuffled.sort(
      (a, b) =>
        b.recallLapses - a.recallLapses || a.recallStreak - b.recallStreak,
    );
  }

  if (scope === "due") {
    return shuffled.sort((a, b) => dueValue(a) - dueValue(b));
  }

  return shuffled;
}

/** Words that can produce a prompt in the requested language. */
export function eligibleWords(words: RecallWord[], language: string) {
  return words.filter((word) => isEligible(word, language));
}

export type QueueOptions = {
  language: string;
  scope: RecallScope;
  pos: RecallPos;
  limit: number;
  now?: Date;
  rng?: () => number;
};

/** Filters by eligibility and part of speech, then orders and truncates. */
export function selectQueue(
  words: RecallWord[],
  {
    language,
    scope,
    pos,
    limit,
    now = new Date(),
    rng = Math.random,
  }: QueueOptions,
): RecallWord[] {
  const eligible = eligibleWords(words, language);
  const filtered = eligible.filter(
    (word) => pos === "all" || posBucket(word.entries[0]?.partOfSpeech) === pos,
  );

  const inScope =
    scope === "due" ? filtered.filter((word) => isDue(word, now)) : filtered;

  return orderQueue(inScope, scope, rng).slice(
    0,
    clampLimit(limit, eligible.length),
  );
}
