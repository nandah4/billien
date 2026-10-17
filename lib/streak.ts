import type { StreakDay } from "./types";

export function jakartaDateKey(date = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
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

/** Consecutive active days ending today (or yesterday when today is still empty). */
export function currentStreak(rows: StreakDay[]) {
  const active = new Set(
    rows
      .filter((row) => row.learned_count > 0 || row.review_count > 0)
      .map((row) => row.activity_date),
  );
  let cursor = jakartaDateKey();
  if (!active.has(cursor)) cursor = previousDateKey(cursor);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }
  return streak;
}
