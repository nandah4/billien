import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RANGE_DAYS,
  addDays,
  bucketKeys,
  daysBetween,
  endOfMonth,
  fillSeries,
  pickGranularity,
  resolveRange,
  startOfMonth,
} from "../lib/analytics/range.ts";

// 03:00Z is 10:00 in Jakarta, so the activity day is the 18th.
const NOW = new Date("2026-10-18T03:00:00.000Z");
const TIME_ZONE = "Asia/Jakarta";

function range(input: {
  preset?: string | null;
  month?: string | null;
  granularity?: string | null;
}) {
  return resolveRange({ ...input, timeZone: TIME_ZONE }, NOW);
}

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-18", 1), "2026-10-19");
  assert.equal(addDays("2026-10-01", -1), "2026-09-30");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("daysBetween is inclusive", () => {
  assert.equal(daysBetween("2026-10-18", "2026-10-18"), 1);
  assert.equal(daysBetween("2026-10-17", "2026-10-18"), 2);
  assert.equal(daysBetween("2026-10-01", "2026-10-31"), 31);
});

test("month helpers handle February and leap years", () => {
  assert.equal(startOfMonth("2026-10-18"), "2026-10-01");
  assert.equal(endOfMonth("2026-10-18"), "2026-10-31");
  assert.equal(endOfMonth("2026-02-10"), "2026-02-28");
  assert.equal(endOfMonth("2024-02-10"), "2024-02-29");
});

test("the 7 day preset ends today", () => {
  const result = range({ preset: "7d" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-10-12");
  assert.equal(result.range.to, "2026-10-18");
  assert.equal(result.range.granularity, "day");
});

test("the 30 day preset is the default", () => {
  const result = range({});
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-09-19");
  assert.equal(daysBetween(result.range.from, result.range.to), 30);
});

test("the 90 day preset stays on daily buckets", () => {
  const result = range({ preset: "90d" });
  assert.ok(result.ok);
  assert.equal(daysBetween(result.range.from, result.range.to), 90);
  assert.equal(result.range.granularity, "day");
});

test("this month starts on the first", () => {
  const result = range({ preset: "this-month" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-10-01");
  assert.equal(result.range.to, "2026-10-18");
});

test("last month is the whole previous month", () => {
  const result = range({ preset: "last-month" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-09-01");
  assert.equal(result.range.to, "2026-09-30");
});

test("year presets switch to monthly buckets", () => {
  const current = range({ preset: "this-year" });
  assert.ok(current.ok);
  assert.equal(current.range.from, "2026-01-01");
  assert.equal(current.range.to, "2026-10-18");
  assert.equal(current.range.granularity, "month");

  const previous = range({ preset: "last-year" });
  assert.ok(previous.ok);
  assert.equal(previous.range.from, "2025-01-01");
  assert.equal(previous.range.to, "2025-12-31");
  assert.equal(previous.range.granularity, "month");
});

test("a month filter wins over the preset", () => {
  const result = range({ preset: "7d", month: "2026-02" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-02-01");
  assert.equal(result.range.to, "2026-02-28");
  assert.equal(result.range.granularity, "day");
});

test("a month filter can reach a previous year", () => {
  const result = range({ month: "2024-02" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2024-02-01");
  assert.equal(result.range.to, "2024-02-29");
});

test("an invalid month is rejected", () => {
  assert.equal(range({ month: "2026-13" }).ok, false);
  assert.equal(range({ month: "2026-1" }).ok, false);
  assert.equal(range({ month: "nope" }).ok, false);
});

test("an unknown preset falls back to the default", () => {
  const result = range({ preset: "all-time" });
  assert.ok(result.ok);
  assert.equal(result.range.from, "2026-09-19");
});

test("granularity switches at 92 days", () => {
  assert.equal(pickGranularity("2026-01-01", "2026-04-02"), "day");
  assert.equal(pickGranularity("2026-01-01", "2026-04-03"), "month");
});

test("an explicit granularity overrides the automatic choice", () => {
  const result = range({ preset: "this-year", granularity: "day" });
  assert.ok(result.ok);
  assert.equal(result.range.granularity, "day");
});

test("a range longer than a year is rejected", () => {
  assert.ok(
    daysBetween("2024-01-01", "2025-12-31") > MAX_RANGE_DAYS,
    "the fixture must exceed the limit",
  );
  assert.equal(range({ preset: "7d" }).ok, true);
});

test("daily buckets cover every day in the window", () => {
  const result = range({ preset: "7d" });
  assert.ok(result.ok);
  const keys = bucketKeys(result.range);
  assert.equal(keys.length, 7);
  assert.equal(keys[0], "2026-10-12");
  assert.equal(keys.at(-1), "2026-10-18");
});

test("monthly buckets cover every month in the window", () => {
  const result = range({ preset: "this-year" });
  assert.ok(result.ok);
  const keys = bucketKeys(result.range);
  assert.deepEqual(keys, [
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ]);
});

test("fillSeries fills empty buckets with zeros", () => {
  const series = fillSeries(
    ["2026-10-17", "2026-10-18"],
    [{ bucket: "2026-10-18", wordsAdded: 4, reviews: 2 }],
  );

  assert.equal(series.length, 2);
  assert.deepEqual(series[0], {
    bucket: "2026-10-17",
    wordsAdded: 0,
    reviews: 0,
    recallSessions: 0,
    recallCards: 0,
    recallAccuracy: null,
  });
  assert.equal(series[1].wordsAdded, 4);
});

test("fillSeries reports null accuracy when a bucket had no session", () => {
  const series = fillSeries(
    ["2026-10-18"],
    [
      {
        bucket: "2026-10-18",
        recallSessions: 0,
        recallCards: 0,
        recallCorrect: 0,
      },
    ],
  );

  assert.equal(series[0].recallAccuracy, null);
});

test("fillSeries derives accuracy from cards, not sessions", () => {
  const series = fillSeries(
    ["2026-10-18"],
    [
      {
        bucket: "2026-10-18",
        recallSessions: 2,
        recallCards: 20,
        recallCorrect: 15,
      },
    ],
  );

  assert.equal(series[0].recallAccuracy, 0.75);
});

/**
 * The shape the accuracy chart has to survive: one session in the whole window
 * leaves a single non-null bucket between nulls. The chart draws a dot for it,
 * because a line needs two points and would otherwise render nothing.
 */
test("one session in a window leaves a lone point surrounded by nulls", () => {
  const keys = ["2026-10-16", "2026-10-17", "2026-10-18"];
  const series = fillSeries(keys, [
    {
      bucket: "2026-10-18",
      recallSessions: 2,
      recallCards: 10,
      recallCorrect: 10,
    },
  ]);

  assert.deepEqual(
    series.map((bucket) => bucket.recallAccuracy),
    [null, null, 1],
  );
});
