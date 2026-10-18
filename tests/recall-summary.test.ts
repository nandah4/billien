import assert from "node:assert/strict";
import test from "node:test";
import {
  accuracyFor,
  accuracyOrNull,
  averageDurationMs,
  summarize,
  totalAnswered,
} from "../lib/recall/summary.ts";
import type { RecallOutcome } from "../lib/recall/types.ts";

test("summarize counts each outcome into exactly one bucket", () => {
  const outcomes: RecallOutcome[] = ["correct", "correct", "almost", "wrong"];
  const counts = summarize(outcomes);

  assert.deepEqual(counts, { correct: 2, almost: 1, wrong: 1 });
  assert.equal(totalAnswered(counts), outcomes.length);
});

test("an empty session summarizes to zero, not to a broken value", () => {
  const counts = summarize([]);

  assert.deepEqual(counts, { correct: 0, almost: 0, wrong: 0 });
  assert.equal(totalAnswered(counts), 0);
  assert.equal(accuracyFor(counts, 0), 0);
  assert.equal(accuracyOrNull(counts, 0), null);
});

test("almost counts towards accuracy, matching the grader", () => {
  const counts = summarize(["correct", "almost", "wrong", "wrong"]);

  assert.equal(accuracyFor(counts, 4), 0.5);
  assert.equal(accuracyOrNull(counts, 4), 0.5);
});

test("a perfect session is 1, a failed one is 0", () => {
  assert.equal(accuracyFor(summarize(["correct", "correct"]), 2), 1);
  assert.equal(accuracyFor(summarize(["wrong", "wrong"]), 2), 0);
});

test("averageDurationMs ignores an empty list", () => {
  assert.equal(averageDurationMs([]), null);
  assert.equal(averageDurationMs([1000, 2000]), 1500);
  assert.equal(averageDurationMs([1000, 2001]), 1501);
});
