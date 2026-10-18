import assert from "node:assert/strict";
import test from "node:test";
import { pickMode } from "../lib/recall/cards.ts";
import { applyCachedTranslations } from "../lib/recall/merge-translations.ts";
import type { RecallWord } from "../lib/recall/types.ts";

function makeWord(
  name: string,
  translations: Record<string, string[]> = {},
  definition = "",
): RecallWord {
  return {
    id: name,
    word: name,
    phonetic: null,
    entries: [
      {
        partOfSpeech: "noun",
        pronunciations: [],
        forms: [],
        senses: [
          {
            definition,
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
    recallStreak: 0,
    recallLapses: 0,
    reviewCount: 0,
    recallDueAt: null,
  };
}

test("a cached translation turns a definition card into a translation card", () => {
  const word = makeWord("house", {}, "A dwelling.");
  assert.equal(pickMode(word, "id"), "definition");

  const [merged] = applyCachedTranslations(
    [word],
    "id",
    new Map([["house", { words: ["rumah"] }]]),
  );

  assert.deepEqual(merged.translations.id, ["rumah"]);
  assert.equal(pickMode(merged, "id"), "translation");
});

test("a dictionary translation is never replaced by the cache", () => {
  const word = makeWord("house", { id: ["rumah", "kediaman"] }, "A dwelling.");

  const [merged] = applyCachedTranslations(
    [word],
    "id",
    new Map([["house", { words: ["bangunan"] }]]),
  );

  assert.deepEqual(merged.translations.id, ["rumah", "kediaman"]);
});

test("a word with no cache entry keeps its definition prompt", () => {
  const word = makeWord("digger", {}, "A machine that digs.");

  const [merged] = applyCachedTranslations([word], "id", new Map());

  assert.deepEqual(merged.translations, {});
  assert.equal(pickMode(merged, "id"), "definition");
});

test("English needs no cache lookup", () => {
  const word = makeWord("house", {}, "A dwelling.");
  const cached = new Map([["house", { words: ["house"] }]]);

  assert.deepEqual(applyCachedTranslations([word], "en", cached), [word]);
});

test("an empty cached list is ignored", () => {
  const word = makeWord("digger", {}, "A machine that digs.");

  const [merged] = applyCachedTranslations(
    [word],
    "id",
    new Map([["digger", { words: [] }]]),
  );

  assert.deepEqual(merged.translations, {});
});
