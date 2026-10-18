import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SESSION_SIZE,
  MAX_SESSION_SIZE,
  MIN_LIBRARY_SIZE,
  clampLimit,
  isDue,
  orderQueue,
  posBucket,
  selectQueue,
} from "../lib/recall/session.ts";
import type { RecallWord } from "../lib/recall/types.ts";

function makeWord(
  name: string,
  options: {
    translations?: Record<string, string[]>;
    dueAt?: string | null;
    streak?: number;
    lapses?: number;
    pos?: string;
  } = {},
): RecallWord {
  const {
    translations = { id: [`arti-${name}`] },
    dueAt = null,
    streak = 0,
    lapses = 0,
    pos = "noun",
  } = options;

  return {
    id: name,
    word: name,
    phonetic: null,
    entries: [
      {
        partOfSpeech: pos,
        pronunciations: [],
        forms: [],
        senses: [
          {
            definition: "",
            tags: [],
            examples: [],
            synonyms: [],
            antonyms: [],
            translations,
          },
        ],
      },
    ],
    translations,
    recallStreak: streak,
    recallLapses: lapses,
    reviewCount: 0,
    recallDueAt: dueAt,
  };
}

const NOW = new Date("2026-01-10T00:00:00.000Z");
const rng = () => 0.5;

test("the session gate is twenty words", () => {
  assert.equal(MIN_LIBRARY_SIZE, 20);
});

test("clampLimit keeps the requested size inside 1..30", () => {
  assert.equal(clampLimit(10), 10);
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(-4), 1);
  assert.equal(clampLimit(999), MAX_SESSION_SIZE);
  assert.equal(clampLimit(Number.NaN), DEFAULT_SESSION_SIZE);
});

test("posBucket groups the long tail under other", () => {
  assert.equal(posBucket("noun"), "noun");
  assert.equal(posBucket("Verb"), "verb");
  assert.equal(posBucket("adjective"), "adjective");
  assert.equal(posBucket("interjection"), "other");
  assert.equal(posBucket(undefined), "other");
});

test("a word is due when it was never practised or its date has passed", () => {
  assert.equal(isDue(makeWord("a", { dueAt: null }), NOW), true);
  assert.equal(isDue(makeWord("a", { dueAt: "2026-01-09T00:00:00.000Z" }), NOW), true);
  assert.equal(isDue(makeWord("a", { dueAt: "2026-01-11T00:00:00.000Z" }), NOW), false);
});

test("selectQueue drops words with nothing to prompt from", () => {
  const words = [
    makeWord("good"),
    makeWord("empty", { translations: {} }),
  ];

  const queue = selectQueue(words, {
    language: "id",
    scope: "all",
    pos: "all",
    limit: 10,
    now: NOW,
    rng,
  });

  assert.deepEqual(
    queue.map((word) => word.word),
    ["good"],
  );
});

test("scope due excludes words scheduled for later", () => {
  const words = [
    makeWord("later", { dueAt: "2026-02-01T00:00:00.000Z" }),
    makeWord("now", { dueAt: null }),
  ];

  const queue = selectQueue(words, {
    language: "id",
    scope: "due",
    pos: "all",
    limit: 10,
    now: NOW,
    rng,
  });

  assert.deepEqual(
    queue.map((word) => word.word),
    ["now"],
  );
});

test("pos narrows the queue", () => {
  const words = [
    makeWord("run", { pos: "verb" }),
    makeWord("cat", { pos: "noun" }),
  ];

  const queue = selectQueue(words, {
    language: "id",
    scope: "all",
    pos: "noun",
    limit: 10,
    now: NOW,
    rng,
  });

  assert.deepEqual(
    queue.map((word) => word.word),
    ["cat"],
  );
});

test("the queue is truncated to the requested size", () => {
  const words = ["a", "b", "c", "d"].map((name) => makeWord(name));
  const queue = selectQueue(words, {
    language: "id",
    scope: "all",
    pos: "all",
    limit: 2,
    now: NOW,
    rng,
  });

  assert.equal(queue.length, 2);
});

test("weak ordering puts the most lapses first, then the shortest streak", () => {
  const words = [
    makeWord("steady", { lapses: 1, streak: 5 }),
    makeWord("worst", { lapses: 4, streak: 0 }),
    makeWord("fragile", { lapses: 4, streak: 1 }),
  ];

  const ordered = orderQueue(words, "weak", rng).map((word) => word.word);
  assert.deepEqual(ordered, ["worst", "fragile", "steady"]);
});

test("due ordering puts never-practised words first", () => {
  const words = [
    makeWord("later", { dueAt: "2026-01-09T12:00:00.000Z" }),
    makeWord("never", { dueAt: null }),
    makeWord("earlier", { dueAt: "2026-01-01T00:00:00.000Z" }),
  ];

  const ordered = orderQueue(words, "due", rng).map((word) => word.word);
  assert.deepEqual(ordered, ["never", "earlier", "later"]);
});
