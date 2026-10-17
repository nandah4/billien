import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  languageLabel,
  normalizeLanguage,
} from "../lib/language.ts";
import { currentStreak, jakartaDateKey, previousDateKey } from "../lib/streak.ts";

test("unknown language values fall back to the default", () => {
  assert.equal(normalizeLanguage("zz"), DEFAULT_LANGUAGE);
  assert.equal(normalizeLanguage(null), DEFAULT_LANGUAGE);
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(isSupportedLanguage("id"), true);
  assert.equal(isSupportedLanguage("de"), false);
  assert.equal(languageLabel("id"), "Bahasa Indonesia");
});

test("streak counts consecutive active days", () => {
  const today = jakartaDateKey();
  const yesterday = previousDateKey(today);
  const rows = [
    { activity_date: today, learned_count: 1, review_count: 0 },
    { activity_date: yesterday, learned_count: 0, review_count: 2 },
  ];
  assert.equal(currentStreak(rows), 2);
  assert.equal(currentStreak([]), 0);
});
