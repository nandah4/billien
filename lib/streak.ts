import type { StreakDayInput } from "./types";

/**
 * Streak days are bucketed by this zone in SQL and interpreted with the same
 * zone in JavaScript. One constant keeps the two from drifting apart.
 */
export const ACTIVITY_TIME_ZONE = "Asia/Jakarta";

/**
 * How much history the header and profile load. A streak longer than this is
 * still correct, because the window is measured back from today.
 */
export const STREAK_WINDOW_DAYS = 400;

/** `YYYY-MM-DD` for the given instant, in the activity zone. */
export function jakartaDateKey(
  date = new Date(),
  timeZone: string = ACTIVITY_TIME_ZONE,
) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    values.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function previousDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

/**
 * Normalises a stored activity date to `YYYY-MM-DD`.
 *
 * SQL already returns the column as text (`activity_date::text`), which is the
 * only lossless form. This guard exists because the Neon driver parses a `date`
 * column into a `Date` object at local midnight: formatting that instant in the
 * activity zone recovers the intended day, whereas `toISOString()` would shift
 * it back by one. Returning `null` for anything unparseable keeps a bad row
 * from silently resetting the streak.
 */
export function streakDateKey(value: string | Date): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return jakartaDateKey(value);
  }

  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : null;
}

/** Days that count as activity: a word saved or a review recorded. */
function activeDates(rows: StreakDayInput[]): Set<string> {
  const active = new Set<string>();

  for (const row of rows) {
    if (row.learned_count <= 0 && row.review_count <= 0) continue;
    const key = streakDateKey(row.activity_date);
    if (key) active.add(key);
  }

  return active;
}

/**
 * Consecutive active days ending today, or yesterday when today is still empty
 * — a streak should not look broken before the day is over.
 */
export function currentStreak(
  rows: StreakDayInput[],
  today: string = jakartaDateKey(),
) {
  const active = activeDates(rows);
  let cursor = today;
  if (!active.has(cursor)) cursor = previousDateKey(cursor);

  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }
  return streak;
}

/** Longest run of consecutive active days anywhere in the rows. */
export function longestStreak(rows: StreakDayInput[]) {
  const days = [...activeDates(rows)].sort();

  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of days) {
    run = previous !== null && previousDateKey(day) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return best;
}

/** Everything the header and analytics need in one pass. */
export function streakState(
  rows: StreakDayInput[],
  today: string = jakartaDateKey(),
) {
  const active = activeDates(rows);
  return {
    current: currentStreak(rows, today),
    longest: longestStreak(rows),
    todayActive: active.has(today),
  };
}
