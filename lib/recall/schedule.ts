import type { RecallOutcome } from "./types.ts";

/** Review intervals in days. The index is the current streak. */
export const LADDER_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;

/** A failed recall is retried later in the same day, not tomorrow. */
export const WRONG_DELAY_MS = 10 * 60 * 1000;

/** Under this, a correct answer with no hint counts as two steps. */
export const FAST_ANSWER_MS = 3000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecallState = { streak: number; lapses: number };

export type RecallSchedule = {
  streak: number;
  lapses: number;
  dueAt: Date;
  /** How many ladder steps the answer earned: 0, 1, or 2. */
  gained: number;
};

export type RecallTiming = {
  durationMs?: number | null;
  usedHint?: boolean;
};

/**
 * Deterministic spaced repetition: one rung per success, two for a fast answer,
 * and a ten-minute retry after a failure. The first success schedules one day
 * out; each further success moves one rung, so a fast answer skips a rung.
 */
export function nextSchedule(
  outcome: RecallOutcome,
  current: RecallState,
  timing: RecallTiming = {},
  now: Date = new Date(),
): RecallSchedule {
  if (outcome === "wrong" || outcome === "revealed") {
    return {
      streak: 0,
      lapses: current.lapses + 1,
      dueAt: new Date(now.getTime() + WRONG_DELAY_MS),
      gained: 0,
    };
  }

  const fast =
    outcome === "correct" &&
    typeof timing.durationMs === "number" &&
    timing.durationMs >= 0 &&
    timing.durationMs < FAST_ANSWER_MS &&
    timing.usedHint !== true;

  const gained = fast ? 2 : 1;
  const index = Math.min(
    Math.max(current.streak + (gained - 1) * 2, 0),
    LADDER_DAYS.length - 1,
  );

  return {
    streak: current.streak + gained,
    lapses: current.lapses,
    dueAt: new Date(now.getTime() + LADDER_DAYS[index] * DAY_MS),
    gained,
  };
}

/**
 * Self-override after a `wrong`: the word is treated as known from today, so it
 * comes back tomorrow rather than in ten minutes.
 */
export function overrideSchedule(
  current: RecallState,
  now: Date = new Date(),
): Pick<RecallSchedule, "streak" | "lapses" | "dueAt"> {
  return {
    streak: Math.max(current.streak, 1),
    lapses: current.lapses,
    dueAt: new Date(now.getTime() + LADDER_DAYS[0] * DAY_MS),
  };
}
