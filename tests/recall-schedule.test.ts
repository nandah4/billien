import assert from "node:assert/strict";
import test from "node:test";
import {
  FAST_ANSWER_MS,
  LADDER_DAYS,
  WRONG_DELAY_MS,
  nextSchedule,
  overrideSchedule,
} from "../lib/recall/schedule.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(dueAt: Date): number {
  return Math.round((dueAt.getTime() - NOW.getTime()) / DAY);
}

test("the first correct answer schedules one day out", () => {
  const schedule = nextSchedule("correct", { streak: 0, lapses: 0 }, {}, NOW);
  assert.equal(schedule.streak, 1);
  assert.equal(daysFromNow(schedule.dueAt), 1);
});

test("consecutive correct answers climb the ladder", () => {
  const intervals: number[] = [];
  let state = { streak: 0, lapses: 0 };

  for (let index = 0; index < 6; index += 1) {
    const schedule = nextSchedule("correct", state, {}, NOW);
    intervals.push(daysFromNow(schedule.dueAt));
    state = { streak: schedule.streak, lapses: schedule.lapses };
  }

  assert.deepEqual(intervals, [1, 3, 7, 14, 30, 60]);
});

test("a fast answer without a hint skips a rung", () => {
  const normal = nextSchedule("correct", { streak: 0, lapses: 0 }, {}, NOW);
  const fast = nextSchedule(
    "correct",
    { streak: 0, lapses: 0 },
    { durationMs: FAST_ANSWER_MS - 1, usedHint: false },
    NOW,
  );

  assert.equal(normal.gained, 1);
  assert.equal(fast.gained, 2);
  assert.equal(fast.streak, 2);
  assert.ok(daysFromNow(fast.dueAt) > daysFromNow(normal.dueAt));
});

test("a hint or a slow answer removes the fast bonus", () => {
  const withHint = nextSchedule(
    "correct",
    { streak: 0, lapses: 0 },
    { durationMs: 500, usedHint: true },
    NOW,
  );
  const slow = nextSchedule(
    "correct",
    { streak: 0, lapses: 0 },
    { durationMs: FAST_ANSWER_MS },
    NOW,
  );

  assert.equal(withHint.gained, 1);
  assert.equal(slow.gained, 1);
});

test("wrong and revealed reset the streak and retry in ten minutes", () => {
  for (const outcome of ["wrong", "revealed"] as const) {
    const schedule = nextSchedule(
      outcome,
      { streak: 4, lapses: 2 },
      { durationMs: 900 },
      NOW,
    );

    assert.equal(schedule.streak, 0);
    assert.equal(schedule.lapses, 3);
    assert.equal(schedule.gained, 0);
    assert.equal(schedule.dueAt.getTime() - NOW.getTime(), WRONG_DELAY_MS);
  }
});

test("almost counts as a success without the fast bonus", () => {
  const schedule = nextSchedule(
    "almost",
    { streak: 1, lapses: 0 },
    { durationMs: 500 },
    NOW,
  );

  assert.equal(schedule.gained, 1);
  assert.equal(schedule.streak, 2);
  assert.equal(daysFromNow(schedule.dueAt), 3);
});

test("the ladder clamps at the longest interval", () => {
  const schedule = nextSchedule(
    "correct",
    { streak: 40, lapses: 0 },
    {},
    NOW,
  );

  assert.equal(daysFromNow(schedule.dueAt), LADDER_DAYS.at(-1));
});

test("override schedules one day out and keeps the lapse", () => {
  const schedule = overrideSchedule({ streak: 0, lapses: 3 }, NOW);

  assert.equal(schedule.streak, 1);
  assert.equal(schedule.lapses, 3);
  assert.equal(daysFromNow(schedule.dueAt), 1);
});
