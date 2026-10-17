import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hasDictionaryTranslation,
  mergeAiTranslation,
  parseModelJson,
  readTranslationReply,
  sanitizeWords,
  targetSenseIndex,
} from "../lib/translate.ts";
import type { Entry } from "../lib/types.ts";

function helloEntries(): Entry[] {
  const fixture = JSON.parse(
    readFileSync(new URL("./fixtures/hello.json", import.meta.url), "utf8"),
  ) as { entries: Entry[] };
  // The fixture mirrors the provider shape, which is a superset of our domain
  // type; only the fields the app reads matter here.
  return fixture.entries.map((entry) => ({
    partOfSpeech: entry.partOfSpeech,
    pronunciations: entry.pronunciations ?? [],
    forms: entry.forms ?? [],
    senses: entry.senses.map((sense) => ({
      definition: sense.definition,
      tags: sense.tags ?? [],
      examples: sense.examples ?? [],
      synonyms: sense.synonyms ?? [],
      antonyms: sense.antonyms ?? [],
      translations: {},
    })),
  }));
}

test("sanitizeWords keeps clean lowercase translations", () => {
  const words = sanitizeWords(["Halo", " halo ", "salam"], { word: "hello" });
  assert.deepEqual(words, ["halo", "salam"]);
});

test("sanitizeWords rejects the headword, markup, digits, and overflow", () => {
  const words = sanitizeWords(
    [
      "eat",
      "<b>makan</b>",
      "makan2",
      "x".repeat(41),
      "memakan",
      "menyantap",
      "melahap",
      "mengonsumsi",
    ],
    { word: "eat" },
  );
  // Only the three clean, distinct entries survive the cap.
  assert.deepEqual(words, ["memakan", "menyantap", "melahap"]);
});

test("sanitizeWords tolerates a non-array payload", () => {
  assert.deepEqual(sanitizeWords("makan", { word: "eat" }), []);
  assert.deepEqual(sanitizeWords(null, { word: "eat" }), []);
});

test("parseModelJson accepts fenced and prose-wrapped JSON", () => {
  assert.deepEqual(parseModelJson('{"translations":["makan"],"confidence":0.9}'), {
    translations: ["makan"],
    confidence: 0.9,
  });
  assert.deepEqual(
    parseModelJson('Here you go:\n```json\n{"translations":["makan"]}\n```'),
    { translations: ["makan"] },
  );
  assert.equal(parseModelJson("no json here"), null);
  assert.equal(parseModelJson("{broken"), null);
});

test("readTranslationReply rejects low confidence and empty results", () => {
  const ok = readTranslationReply(
    '{"translations":["makan"],"confidence":0.92}',
    { word: "eat", senseIndex: 0 },
  );
  assert.deepEqual(ok, { words: ["makan"], confidence: 0.92, senseIndex: 0 });

  const unsure = readTranslationReply(
    '{"translations":["makan"],"confidence":0.4}',
    { word: "eat", senseIndex: 0 },
  );
  assert.equal(unsure, null);

  const echoed = readTranslationReply(
    '{"translations":["eat"],"confidence":0.99}',
    { word: "eat", senseIndex: 0 },
  );
  assert.equal(echoed, null);
});

test("targetSenseIndex points at the first sense with a definition", () => {
  const entries = helloEntries();
  assert.equal(targetSenseIndex(entries), 0);

  const emptyFirst: Entry[] = [
    {
      partOfSpeech: "noun",
      pronunciations: [],
      forms: [],
      senses: [
        {
          definition: "",
          tags: [],
          examples: [],
          synonyms: [],
          antonyms: [],
          translations: {},
        },
      ],
    },
    {
      partOfSpeech: "verb",
      pronunciations: [],
      forms: [],
      senses: [
        {
          definition: "To consume food.",
          tags: [],
          examples: [],
          synonyms: [],
          antonyms: [],
          translations: {},
        },
      ],
    },
  ];
  assert.equal(targetSenseIndex(emptyFirst), 1);
  assert.equal(targetSenseIndex([]), null);
});

test("hasDictionaryTranslation detects an existing translation", () => {
  const entries = helloEntries();
  entries[0].senses[0].translations = { id: ["halo"] };
  assert.equal(hasDictionaryTranslation(entries, "id"), true);
  assert.equal(hasDictionaryTranslation(entries, "es"), false);
});

test("mergeAiTranslation fills only the targeted empty sense", () => {
  const entries = helloEntries();
  const merged = mergeAiTranslation(entries, { words: ["halo"], senseIndex: 0 }, "id");

  assert.deepEqual(merged[0].senses[0].translations, { id: ["halo"] });
  assert.equal(merged[0].senses[0].translationSource, "ai");
  assert.deepEqual(merged[0].senses[1].translations, {});
  assert.equal(merged[0].senses[1].translationSource, undefined);
});

test("mergeAiTranslation never overwrites dictionary data", () => {
  const entries = helloEntries();
  entries[0].senses[0].translations = { id: ["hai"] };
  const merged = mergeAiTranslation(entries, { words: ["halo"], senseIndex: 0 }, "id");

  assert.deepEqual(merged[0].senses[0].translations, { id: ["hai"] });
  assert.equal(merged[0].senses[0].translationSource, undefined);
});

test("mergeAiTranslation is a no-op without a cached result", () => {
  const entries = helloEntries();
  assert.equal(mergeAiTranslation(entries, null, "id"), entries);
  assert.equal(
    mergeAiTranslation(entries, { words: [], senseIndex: 0 }, "id"),
    entries,
  );
});
