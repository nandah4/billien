import assert from "node:assert/strict";
import test from "node:test";
import {
  filterItems,
  paginate,
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
  const result = filterItems(items, { query: "halo", filter: "all" });
  assert.deepEqual(
    result.map((item) => item.word),
    ["hello"],
  );
});

test("filter combines with the search term", () => {
  const items = [word("hello", ["halo"]), word("run", ["lari"])];
  assert.equal(
    filterItems(items, { query: "la", filter: "noun" }).length,
    1,
  );
  assert.equal(
    filterItems(items, { query: "la", filter: "verb" }).length,
    0,
  );
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
