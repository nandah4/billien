import assert from "node:assert/strict";
import test from "node:test";
import {
  detectFormOfGloss,
  formKindLabel,
  parseFormOf,
  suffixCandidates,
} from "../lib/word-forms.ts";
import type { Entry } from "../lib/types.ts";

function entry(
  partOfSpeech: string,
  definitions: string[],
  extra: Partial<Entry> = {},
): Entry {
  return {
    partOfSpeech,
    pronunciations: [],
    forms: [],
    senses: definitions.map((definition) => ({
      definition,
      tags: [],
      examples: [],
      synonyms: [],
      antonyms: [],
      translations: {},
    })),
    ...extra,
  };
}

test("parseFormOf reads the glosses the provider actually returns", () => {
  const cases: [string, string, string][] = [
    ["simple past of run", "past", "run"],
    ["simple past of rin", "past", "rin"],
    ["simple past of go", "past", "go"],
    ["simple past and past participle of walk", "past", "walk"],
    ["past participle of rin", "past-participle", "rin"],
    ["(nonstandard) past participle of go", "past-participle", "go"],
    ["present participle and gerund of run", "present-participle", "run"],
    ["plural of child", "plural", "child"],
    ["plural of childer", "plural", "childer"],
    ["plural of mouse", "plural", "mouse"],
    [
      "third-person singular simple present indicative of box",
      "third-person",
      "box",
    ],
    ["third-person singular present of saw", "third-person", "saw"],
    ["comparative degree of good and well", "comparative", "good"],
    ["comparative form of well: more well", "comparative", "well"],
    ["superlative of good", "superlative", "good"],
  ];

  for (const [definition, kind, lemma] of cases) {
    assert.deepEqual(parseFormOf(definition), { kind, lemma }, definition);
  }
});

test("parseFormOf strips a trailing note without eating the lemma", () => {
  assert.deepEqual(
    parseFormOf(
      "simple past and past participle of leave (“depart, separate…”)",
    ),
    { kind: "past", lemma: "leave" },
  );
  assert.deepEqual(parseFormOf("plural of child."), {
    kind: "plural",
    lemma: "child",
  });
});

test("parseFormOf leaves real definitions alone", () => {
  const definitions = [
    "A tool used for cutting hard substances, in particular wood or metal.",
    "To move swiftly.",
    "Designating the side of the body toward the west when one is facing north.",
    "(nautical) Yarns coiled on a spun-yarn winch.",
    "",
    "Act or instance of running, of moving rapidly using the feet.",
  ];

  for (const definition of definitions) {
    assert.equal(parseFormOf(definition), null, definition);
  }
});

test("detectFormOfGloss reads only the primary entry", () => {
  assert.deepEqual(
    detectFormOfGloss([
      entry("verb", ["simple past of run", "simple past of rin"]),
      entry("noun", ["(nautical) Yarns coiled on a spun-yarn winch."]),
    ]),
    { kind: "past", lemma: "run" },
  );
});

test("detectFormOfGloss refuses a homograph that stands on its own", () => {
  // `saw` is a tool first; the past of `see` is a later entry and must not
  // rewrite the meanings of the noun.
  assert.equal(
    detectFormOfGloss([
      entry("noun", ["A tool used for cutting hard substances."]),
      entry("verb", ["simple past of see"]),
    ]),
    null,
  );

  // `better` opens with a comparative gloss but also has a real sense.
  assert.equal(
    detectFormOfGloss([
      entry("adjective", [
        "comparative degree of good and well",
        "Greater in amount or quantity.",
      ]),
    ]),
    null,
  );

  // `left` and `making` are lemmas in their primary entry.
  assert.equal(
    detectFormOfGloss([
      entry("adjective", ["Designating the side of the body toward the west."]),
      entry("verb", ["simple past and past participle of leave"]),
    ]),
    null,
  );
  assert.equal(
    detectFormOfGloss([
      entry("noun", ["The act of forming, causing, or constituting."]),
      entry("verb", ["present participle and gerund of make"]),
    ]),
    null,
  );
});

test("detectFormOfGloss ignores an empty or self-referential relation", () => {
  assert.equal(detectFormOfGloss([]), null);
  assert.equal(detectFormOfGloss([entry("verb", [])]), null);
  assert.equal(
    detectFormOfGloss([entry("verb", ["simple past of run"])], "run"),
    null,
  );
});

test("suffixCandidates puts the real lemma first", () => {
  const first = (word: string) => suffixCandidates(word)[0];

  assert.deepEqual(first("walked"), { word: "walk", kind: "past" });
  assert.deepEqual(first("cities"), { word: "city", kind: "plural" });
  assert.deepEqual(first("boxes"), { word: "box", kind: "plural" });
  assert.deepEqual(first("studied"), { word: "study", kind: "past" });
  assert.deepEqual(first("bigger"), { word: "big", kind: "comparative" });
  assert.deepEqual(first("happiest"), { word: "happy", kind: "superlative" });
});

test("suffixCandidates repairs doubled consonants and a dropped e", () => {
  const words = (word: string) =>
    suffixCandidates(word).map((item) => item.word);

  assert.ok(words("running").includes("run"));
  assert.ok(words("stopped").includes("stop"));
  assert.ok(words("making").includes("make"));
  assert.ok(words("liked").includes("like"));
  assert.ok(words("houses").includes("house"));
});

test("suffixCandidates ignores words it cannot repair", () => {
  assert.deepEqual(suffixCandidates(""), []);
  assert.deepEqual(suffixCandidates("123"), []);
  assert.deepEqual(suffixCandidates("a"), []);
  assert.deepEqual(suffixCandidates("as"), []);
  assert.deepEqual(suffixCandidates("zzzed"), [
    { word: "zzz", kind: "past" },
    { word: "zz", kind: "past" },
    { word: "zzze", kind: "past" },
  ]);
});

test("formKindLabel covers every kind", () => {
  assert.equal(formKindLabel("past"), "Past tense");
  assert.equal(formKindLabel("plural"), "Plural");
  assert.equal(formKindLabel("third-person"), "Third-person singular");
  assert.equal(formKindLabel("form"), "Form");
});
