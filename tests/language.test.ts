import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  isSupportedLanguage,
  languageLabel,
  languageName,
  normalizeLanguage,
  searchLanguages,
} from "../lib/language.ts";
import {
  currentStreak,
  jakartaDateKey,
  previousDateKey,
} from "../lib/streak.ts";

test("unknown language values fall back to the default", () => {
  assert.equal(normalizeLanguage("zz"), DEFAULT_LANGUAGE);
  assert.equal(normalizeLanguage(null), DEFAULT_LANGUAGE);
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(isSupportedLanguage("id"), true);
  assert.equal(isSupportedLanguage("de"), true);
  assert.equal(isSupportedLanguage("zz"), false);
  assert.equal(languageLabel("id"), "Bahasa Indonesia");
});

test("the catalogue covers far more than the original three languages", () => {
  assert.ok(LANGUAGES.length >= 50, `only ${LANGUAGES.length} languages`);
  const codes = new Set(LANGUAGES.map((language) => language.code));
  assert.equal(codes.size, LANGUAGES.length, "codes must be unique");
  for (const code of ["id", "en", "es", "de", "ja", "ru", "pt-BR"])
    assert.ok(codes.has(code), `missing ${code}`);
});

test("every catalogue entry has a name and a native name", () => {
  for (const language of LANGUAGES) {
    assert.ok(language.name.trim(), `${language.code} has no name`);
    assert.ok(
      language.nativeName.trim(),
      `${language.code} has no native name`,
    );
  }
});

test("languageName resolves the English label for a code", () => {
  assert.equal(languageName("ja"), "Japanese");
  assert.equal(languageName("nope"), "Unknown");
});

test("search matches code, English name, and native name without accents", () => {
  assert.deepEqual(
    searchLanguages("espanol").map((language) => language.code),
    ["es"],
  );
  assert.deepEqual(
    searchLanguages("japanese").map((language) => language.code),
    ["ja"],
  );
  assert.deepEqual(
    searchLanguages("de")
      .map((language) => language.code)
      .includes("de"),
    true,
  );
  assert.equal(searchLanguages("").length, LANGUAGES.length);
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
