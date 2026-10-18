import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ANSWER_LENGTH,
  gradeAnswer,
  gradeChoice,
  levenshtein,
  normalizeAnswer,
} from "../lib/recall/grade.ts";

test("normalizeAnswer ignores case, edges, and extra spaces", () => {
  assert.equal(normalizeAnswer("  Achieve  "), "achieve");
  assert.equal(normalizeAnswer("achieve."), "achieve");
  assert.equal(normalizeAnswer("(achieve)"), "achieve");
  assert.equal(normalizeAnswer("a   chieve"), "a chieve");
});

test("normalizeAnswer folds curly quotes and diacritics", () => {
  assert.equal(normalizeAnswer("don’t"), "don't");
  assert.equal(normalizeAnswer("ACHİEVE"), "achieve");
  assert.equal(normalizeAnswer("café"), "cafe");
});

test("normalizeAnswer keeps internal punctuation meaningful", () => {
  assert.equal(normalizeAnswer("don't"), "don't");
  assert.notEqual(normalizeAnswer("don't"), normalizeAnswer("dont"));
  assert.equal(normalizeAnswer("well-known"), "well-known");
});

test("gradeAnswer accepts the headword and its forms", () => {
  assert.equal(gradeAnswer("Achieve ", { word: "achieve" }), "correct");
  assert.equal(gradeAnswer("achieve.", { word: "achieve" }), "correct");
  assert.equal(gradeAnswer("ACHİEVE", { word: "achieve" }), "correct");
  assert.equal(
    gradeAnswer("ate", { word: "eat", forms: ["ate", "eaten"] }),
    "correct",
  );
});

test("gradeAnswer forgives one edit only on longer words", () => {
  assert.equal(gradeAnswer("acheive", { word: "achieve" }), "almost");
  assert.equal(gradeAnswer("achiev", { word: "achieve" }), "almost");
  // Four letters are too short to distinguish a typo from a different word.
  assert.equal(gradeAnswer("cta", { word: "cat" }), "wrong");
});

test("gradeAnswer rejects unrelated answers and empty input", () => {
  assert.equal(gradeAnswer("xyz", { word: "achieve" }), "wrong");
  assert.equal(gradeAnswer("", { word: "achieve" }), "wrong");
  assert.equal(gradeAnswer("   ", { word: "achieve" }), "wrong");
  assert.equal(
    gradeAnswer("a".repeat(MAX_ANSWER_LENGTH + 1), { word: "achieve" }),
    "wrong",
  );
});

test("gradeAnswer treats an apostrophe as significant", () => {
  assert.equal(gradeAnswer("dont", { word: "don't" }), "wrong");
  assert.equal(gradeAnswer("don't", { word: "don't" }), "correct");
});

test("levenshtein counts a transposition as one edit", () => {
  assert.equal(levenshtein("acheive", "achieve"), 1);
  assert.equal(levenshtein("cat", "dog"), 3);
  assert.equal(levenshtein("", "abc"), 3);
});

test("gradeChoice compares meanings, not the headword", () => {
  assert.equal(gradeChoice("mencapai", ["mencapai", "meraih"]), "correct");
  assert.equal(gradeChoice(" Meraih ", ["mencapai", "meraih"]), "correct");
  assert.equal(gradeChoice("achieve", ["mencapai"]), "wrong");
});
