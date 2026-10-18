import assert from "node:assert/strict";
import test from "node:test";
import { applyAnswer, type RecallDraft } from "../lib/recall/draft.ts";
import type { RecallCard, RecallSessionAnswer } from "../lib/recall/types.ts";

function card(id: string): RecallCard {
  return {
    id,
    mode: "translation",
    partOfSpeech: "noun",
    prompt: { kind: "definition", language: "id", definition: `meaning of ${id}` },
    hint: { length: id.length, initial: id[0] ?? "" },
    stats: { recallStreak: 0, lapses: 0, reviewCount: 0 },
  };
}

function draftWith(cards: string[]): RecallDraft {
  return {
    version: 1,
    clientSessionId: "client-1",
    startedAt: "2026-10-18T00:00:00.000Z",
    scope: "due",
    limit: cards.length,
    index: 0,
    answers: {},
    cards: cards.map(card),
    savedAt: "2026-10-18T00:00:00.000Z",
  };
}

function answer(id: string, response: string, position: number): RecallSessionAnswer {
  return {
    userWordId: id,
    position,
    mode: "translation",
    response,
    durationMs: 1200,
    usedHint: false,
  };
}

test("an answer is stored and the draft moves to the next card", () => {
  const first = applyAnswer(draftWith(["house", "eat"]), answer("house", "rumah", 0));

  assert.equal(first.isLast, false);
  assert.equal(first.draft.index, 1);
  assert.equal(first.draft.answers.house.response, "rumah");
});

test("answers survive the whole session instead of being wiped on advance", () => {
  const ids = ["house", "eat", "music", "learn", "fan"];
  let draft = draftWith(ids);

  for (const [position, id] of ids.entries()) {
    const step = applyAnswer(draft, answer(id, `${id}-answer`, position));
    draft = step.draft;
  }

  assert.deepEqual(
    ids.map((id) => draft.answers[id]?.response),
    ids.map((id) => `${id}-answer`),
  );
  assert.equal(draft.index, ids.length - 1);
});

test("the last card stays on screen and reports completion", () => {
  const started = draftWith(["house"]);
  const step = applyAnswer(started, answer("house", "rumah", 0));

  assert.equal(step.isLast, true);
  assert.equal(step.draft.index, 0);
  assert.equal(step.draft.answers.house.response, "rumah");
});

test("a corrected answer replaces the earlier one for the same word", () => {
  const started = draftWith(["house", "eat"]);
  const first = applyAnswer(started, answer("house", "wrong", 0)).draft;
  const again = applyAnswer({ ...first, index: 0 }, answer("house", "rumah", 0));

  assert.equal(again.draft.answers.house.response, "rumah");
});

test("advancing does not mutate the draft it was given", () => {
  const started = draftWith(["house", "eat"]);
  const before = JSON.stringify(started);

  applyAnswer(started, answer("house", "rumah", 0));

  assert.equal(JSON.stringify(started), before);
});
