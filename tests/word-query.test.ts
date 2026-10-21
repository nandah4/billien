import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidWordQuery,
  normalizeWordQuery,
} from "../lib/word-query.ts";

test("accepts a single word, including a one-letter one", () => {
  for (const word of ["hello", "a", "I", "run"]) {
    assert.ok(isValidWordQuery(word), `expected ${word} to be valid`);
  }
});

test("accepts a multi-word entry", () => {
  for (const phrase of ["according to", "give up", "in spite of"]) {
    assert.ok(isValidWordQuery(phrase), `expected ${phrase} to be valid`);
  }
});

test("accepts apostrophes and hyphens inside a word", () => {
  for (const word of ["o'clock", "well-known", "don’t"]) {
    assert.ok(isValidWordQuery(word), `expected ${word} to be valid`);
  }
});

test("rejects digits, punctuation, and stray symbols", () => {
  for (const value of ["word1", "hello,", "according to!", "$word", "word/"]) {
    assert.equal(isValidWordQuery(value), false, `expected ${value} to fail`);
  }
});

test("rejects an empty or whitespace-only query", () => {
  for (const value of ["", "   ", "\n\t"]) {
    assert.equal(isValidWordQuery(value), false, `expected ${JSON.stringify(value)} to fail`);
  }
});

test("normalizes case and collapses whitespace", () => {
  assert.equal(normalizeWordQuery("  According   To  "), "according to");
  assert.equal(normalizeWordQuery("HELLO"), "hello");
  assert.equal(normalizeWordQuery("well-known"), "well-known");
});

test("irregular spacing resolves to the same query", () => {
  assert.ok(isValidWordQuery("according   to"));
  assert.equal(
    normalizeWordQuery("according   to"),
    normalizeWordQuery("according to"),
  );
});
