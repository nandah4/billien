import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_SENSES_PER_ENTRY,
  normalizeDictionary,
  projectDictionary,
  projectSavedWord,
  projectSavedWordForList,
} from "../lib/normalize.ts";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  ) as unknown;
}

test("normalizes hello: dedupes translations and drops subsenses", () => {
  const result = normalizeDictionary(fixture("hello") as never);

  assert.equal(result.word, "hello");
  assert.equal(result.normalized_word, "hello");
  assert.equal(result.phonetic, "/hɛˈloʊ/");
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].partOfSpeech, "interjection");

  assert.deepEqual(result.entries[0].senses[0].translations, {
    id: ["hai", "salam"],
    es: ["hola"],
  });
  assert.deepEqual(result.entries[0].senses[1].translations, { id: ["halo"] });

  // The recursive provider field must never be stored.
  assert.equal(
    "subsenses" in (result.entries[0].senses[1] as Record<string, unknown>),
    false,
  );
  assert.equal(
    "quotes" in (result.entries[0].senses[0] as Record<string, unknown>),
    false,
  );

  assert.deepEqual(result.translations, {
    id: ["hai", "salam", "halo"],
    es: ["hola"],
  });
  // Duplicate form differing only by case is removed.
  assert.deepEqual(result.forms, [{ word: "hallo", tags: ["alternative"] }]);
  assert.equal(result.source?.license?.name, "CC BY-SA 4.0");
});

test("caps an entry with many senses", () => {
  const senses = Array.from({ length: 69 }, (_, index) => ({
    definition: `Definition ${index}`,
    tags: [],
    examples: [],
    synonyms: [],
    antonyms: [],
    translations: [],
  }));

  const result = normalizeDictionary({
    word: "run",
    entries: [{ partOfSpeech: "verb", senses }],
  });

  assert.equal(result.entries[0].senses.length, MAX_SENSES_PER_ENTRY);
  assert.ok(JSON.stringify(result).length < 20_000);
});

test("eat has no translations and still normalizes", () => {
  const result = normalizeDictionary(fixture("eat") as never);
  assert.deepEqual(result.translations, {});
  assert.deepEqual(result.entries[0].senses[0].translations, {});
  assert.equal(result.source, null);
});

test("projects a dictionary result to one language", () => {
  const normalized = normalizeDictionary(fixture("hello") as never);
  const result = projectDictionary(
    {
      word: normalized.word,
      entries: normalized.entries,
      source: normalized.source,
    },
    "id",
  );

  assert.deepEqual(result.entries[0].senses[0].translations, {
    id: ["hai", "salam"],
  });
  assert.deepEqual(result.entries[0].senses[1].translations, { id: ["halo"] });
});

test("projects a saved word map and keeps every language for all", () => {
  const normalized = normalizeDictionary(fixture("hello") as never);
  const saved = {
    entries: normalized.entries,
    translations: normalized.translations,
  };

  assert.deepEqual(projectSavedWord(saved, "es").translations, {
    es: ["hola"],
  });
  assert.deepEqual(
    projectSavedWord(saved, "all").translations,
    normalized.translations,
  );
});

test("list projection keeps one sense and drops list-irrelevant fields", () => {
  const normalized = normalizeDictionary(fixture("hello") as never);
  const projected = projectSavedWordForList(
    { entries: normalized.entries, translations: normalized.translations },
    "id",
  );

  assert.equal(projected.entries[0].senses.length, 1);
  assert.deepEqual(projected.entries[0].senses[0].translations, {
    id: ["hai", "salam"],
  });
  assert.deepEqual(projected.entries[0].senses[0].examples, []);
  assert.deepEqual(projected.entries[0].senses[0].synonyms, []);
  assert.deepEqual(projected.translations, { id: ["hai", "salam", "halo"] });
});
