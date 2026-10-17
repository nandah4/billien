import assert from "node:assert/strict";
import test from "node:test";
import {
  paginate,
  searchItems,
  sortItems,
  type LibraryWord,
} from "../lib/library.ts";

function word(
  name: string,
  translation: string[] = [],
  addedAt = "2026-01-01T00:00:00Z",
  reviews = 0,
): LibraryWord {
  return {
    key: name,
    word: name,
    phonetic: null,
    entries: [
      {
        partOfSpeech: "noun",
        pronunciations: [],
        forms: [],
        senses: [
          {
            definition: `Definition of ${name}`,
            tags: [],
            examples: [],
            synonyms: [],
            antonyms: [],
            translations: {},
          },
        ],
      },
    ],
    translation,
    savedWord: {
      id: name,
      word: name,
      normalized_word: name,
      phonetic: null,
      entries: [],
      translations: {},
      forms: [],
      source: null,
      added_at: addedAt,
      last_reviewed_at: null,
      review_count: reviews,
      remembered_count: 0,
      forgotten_count: 0,
    },
  };
}

test("search matches the preferred-language translation", () => {
  const items = [word("hello", ["halo"]), word("run", ["lari"])];
  const result = searchItems(items, "halo");
  assert.deepEqual(
    result.map((item: LibraryWord) => item.word),
    ["hello"],
  );
});

test("search also matches the English headword", () => {
  const items = [word("hello", ["halo"]), word("run", ["lari"])];
  assert.deepEqual(
    searchItems(items, "ru").map((item: LibraryWord) => item.word),
    ["run"],
  );
});

test("an empty search returns everything", () => {
  const items = [word("hello", ["halo"]), word("run", ["lari"])];
  assert.equal(searchItems(items, "   ").length, 2);
});

test("sort orders by date, alphabet, and review count", () => {
  const items = [
    word("beta", [], "2026-01-01T00:00:00Z", 2),
    word("alpha", [], "2026-02-01T00:00:00Z", 9),
  ];
  assert.deepEqual(
    sortItems(items, "az").map((item) => item.word),
    ["alpha", "beta"],
  );
  assert.deepEqual(
    sortItems(items, "recent").map((item) => item.word),
    ["alpha", "beta"],
  );
  assert.deepEqual(
    sortItems(items, "reviews").map((item) => item.word),
    ["alpha", "beta"],
  );
});

test("paginate clamps the page into range", () => {
  const items = Array.from({ length: 9 }, (_, index) => word(`w${index}`));
  assert.equal(paginate(items, 99).currentPage, 2);
  assert.equal(paginate(items, 0).currentPage, 1);
  assert.equal(paginate([], 4).pageCount, 1);
});
