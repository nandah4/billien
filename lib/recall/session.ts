import { isEligible } from "./cards.ts";
import { shuffle } from "./random.ts";
import type { RecallPos, RecallScope, RecallWord } from "./types.ts";

/**
 * A session needs enough words behind it that ten cards are not the whole
 * library; below this the Recall tab shows a gate instead of a session.
 */
export const MIN_LIBRARY_SIZE = 20;

export const DEFAULT_SESSION_SIZE = 10;
export const MAX_SESSION_SIZE = 30;

export function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SESSION_SIZE;
  return Math.max(1, Math.min(Math.trunc(value), MAX_SESSION_SIZE));
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
  const eligible = words.filter(
    (word) =>
      isEligible(word, language) &&
      (pos === "all" || posBucket(word.entries[0]?.partOfSpeech) === pos),
  );

  const inScope =
    scope === "due" ? eligible.filter((word) => isDue(word, now)) : eligible;

  return orderQueue(inScope, scope, rng).slice(0, clampLimit(limit));
}
