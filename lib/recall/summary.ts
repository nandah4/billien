import type { RecallOutcome, RecallSessionCounts } from "./types.ts";

/**
 * Counts a session's outcomes. Every item lands in exactly one bucket, so the
 * three counts always add up to the number of items — the same invariant the
 * database enforces on the session fact row.
 */
export function summarize(outcomes: RecallOutcome[]): RecallSessionCounts {
  const counts: RecallSessionCounts = { correct: 0, almost: 0, wrong: 0 };
  for (const outcome of outcomes) counts[outcome] += 1;
  return counts;
}

export function totalAnswered(counts: RecallSessionCounts): number {
  return counts.correct + counts.almost + counts.wrong;
}

/**
 * Share of answers that counted as a success. `almost` counts, matching the
 * grader and the statistics endpoint. An empty session is `0`, never `NaN`.
 */
export function accuracyFor(
  counts: RecallSessionCounts,
  cardCount: number,
): number {
  if (cardCount <= 0) return 0;
  return (counts.correct + counts.almost) / cardCount;
}

/** `null` when nothing was answered, so the UI can say "no sessions yet". */
export function accuracyOrNull(
  counts: RecallSessionCounts,
  cardCount: number,
): number | null {
  if (cardCount <= 0) return null;
  return accuracyFor(counts, cardCount);
}

export function averageDurationMs(durations: number[]): number | null {
  if (durations.length === 0) return null;
  const total = durations.reduce((sum, value) => sum + value, 0);
  return Math.round(total / durations.length);
}
