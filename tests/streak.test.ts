import assert from "node:assert/strict";
import test from "node:test";
import {
  currentStreak,
  jakartaDateKey,
  longestStreak,
  previousDateKey,
  streakDateKey,
  streakState,
} from "../lib/streak.ts";

const TODAY = "2026-10-18";

function day(
  activity_date: string | Date,
  learned = 1,
  reviews = 0,
): { activity_date: string | Date; learned_count: number; review_count: number } {
  return {
    activity_date,
    learned_count: learned,
    review_count: reviews,
  };
}

test("jakartaDateKey formats an instant in the activity zone", () => {
  // 17:00Z is midnight in Jakarta, so the day is the 18th.
  assert.equal(jakartaDateKey(new Date("2026-10-17T17:00:00.000Z")), "2026-10-18");
  assert.equal(jakartaDateKey(new Date("2026-10-18T00:00:00.000Z")), "2026-10-18");
  assert.equal(jakartaDateKey(new Date("2026-10-18T16:59:59.000Z")), "2026-10-18");
  assert.equal(jakartaDateKey(new Date("2026-10-18T17:00:00.000Z")), "2026-10-19");
});

test("previousDateKey crosses month and year boundaries", () => {
  assert.equal(previousDateKey("2026-10-18"), "2026-10-17");
  assert.equal(previousDateKey("2026-10-01"), "2026-09-30");
  assert.equal(previousDateKey("2026-01-01"), "2025-12-31");
});

test("streakDateKey keeps a text date as-is", () => {
  assert.equal(streakDateKey("2026-10-18"), "2026-10-18");
  assert.equal(streakDateKey("2026-10-18T00:00:00.000Z"), "2026-10-18");
});

test("streakDateKey recovers the day from a driver Date", () => {
  // Regression: `toISOString().slice(0, 10)` would return 2026-10-17 here and
  // silently reset the streak to zero.
  assert.equal(streakDateKey(new Date("2026-10-17T17:00:00.000Z")), "2026-10-18");
  assert.equal(streakDateKey(new Date("2026-10-18T00:00:00.000Z")), "2026-10-18");
});

test("streakDateKey rejects an unparseable value instead of guessing", () => {
  assert.equal(streakDateKey("not a date"), null);
  assert.equal(streakDateKey(new Date(Number.NaN)), null);
});

test("a streak ending today counts today", () => {
  const rows = [day(TODAY), day("2026-10-17"), day("2026-10-16")];
  assert.equal(currentStreak(rows, TODAY), 3);
});

test("an empty today does not break the streak", () => {
  const rows = [day("2026-10-17"), day("2026-10-16")];
  assert.equal(currentStreak(rows, TODAY), 2);
});

test("a missing day ends the streak", () => {
  const rows = [day(TODAY), day("2026-10-17"), day("2026-10-15")];
  assert.equal(currentStreak(rows, TODAY), 2);
});

test("the real shape of the sample account is two days", () => {
  const rows = [day(TODAY), day("2026-10-17"), day("2026-10-15")];
  assert.equal(currentStreak(rows, TODAY), 2);
});

test("a day with no learned words or reviews is not active", () => {
  const rows = [day(TODAY, 0, 0), day("2026-10-17")];
  assert.equal(currentStreak(rows, TODAY), 1);
});

test("a review alone keeps the day active", () => {
  const rows = [day(TODAY, 0, 3), day("2026-10-17", 2, 0)];
  assert.equal(currentStreak(rows, TODAY), 2);
});

test("driver Date rows produce the same streak as text rows", () => {
  const asText = [day(TODAY), day("2026-10-17")];
  const asDate = [
    day(new Date("2026-10-17T17:00:00.000Z")),
    day(new Date("2026-10-16T17:00:00.000Z")),
  ];

  assert.equal(currentStreak(asText, TODAY), 2);
  assert.equal(currentStreak(asDate, TODAY), 2);
});

test("longestStreak finds the best run across gaps", () => {
  const rows = [
    day("2026-10-01"),
    day("2026-10-02"),
    day("2026-10-03"),
    day("2026-10-06"),
    day("2026-10-07"),
  ];
  assert.equal(longestStreak(rows), 3);
});

test("longestStreak ignores inactive days", () => {
  const rows = [
    day("2026-10-01"),
    day("2026-10-02", 0, 0),
    day("2026-10-03"),
  ];
  assert.equal(longestStreak(rows), 1);
});

test("longestStreak is zero without activity", () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak([day(TODAY, 0, 0)]), 0);
});

test("streakState reports current, longest, and today", () => {
  const rows = [day(TODAY), day("2026-10-17"), day("2026-10-10")];
  assert.deepEqual(streakState(rows, TODAY), {
    current: 2,
    longest: 2,
    todayActive: true,
  });
});
