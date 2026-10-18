import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCard,
  buildCloze,
  isEligible,
  pickDistractors,
  pickMode,
  type DistractorCandidate,
} from "../lib/recall/cards.ts";
import type { RecallWord } from "../lib/recall/types.ts";

type Options = {
  translations?: Record<string, string[]>;
  definition?: string | null;
  examples?: string[];
  forms?: string[];
  pos?: string;
  id?: string;
  streak?: number;
  lapses?: number;
  reviews?: number;
};

function makeWord(name: string, options: Options = {}): RecallWord {
  const {
    translations = {},
    definition = null,
    examples = [],
    forms = [],
    pos = "verb",
    id = name,
    streak = 0,
    lapses = 0,
    reviews = 0,
  } = options;

  return {
    id,
    word: name,
    phonetic: null,
    entries: [
      {
        partOfSpeech: pos,
        pronunciations: [],
        forms: forms.map((word) => ({ word, tags: [] })),
        senses: [
          {
            definition: definition ?? "",
            tags: [],
            examples,
            synonyms: [],
            antonyms: [],
            translations,
          },
        ],
      },
    ],
    translations,
    recallStreak: streak,
    recallLapses: lapses,
    reviewCount: reviews,
    recallDueAt: null,
  };
}

test("a word with a translation uses the translation prompt", () => {
  const word = makeWord("achieve", {
    translations: { id: ["mencapai", "meraih"] },
    definition: "To succeed in something.",
  });

  assert.equal(pickMode(word, "id"), "translation");
  const card = buildCard(word, "id");
  assert.equal(card?.mode, "translation");
  assert.equal(card?.prompt.kind, "translation");
  if (card?.prompt.kind === "translation") {
    assert.deepEqual(card.prompt.words, ["mencapai", "meraih"]);
    assert.equal(card.prompt.definition, "To succeed in something.");
  }
});

test("a word without a translation falls back to the definition", () => {
  const word = makeWord("achieve", {
    definition: "To succeed in something.",
  });

  assert.equal(pickMode(word, "id"), "definition");
  const card = buildCard(word, "id");
  assert.equal(card?.prompt.kind, "definition");
});

test("a word with only an example falls back to cloze", () => {
  const word = makeWord("achieve", {
    examples: ["They achieve great things."],
  });

  assert.equal(pickMode(word, "id"), "cloze");
  const card = buildCard(word, "id");
  assert.equal(card?.prompt.kind, "cloze");
  if (card?.prompt.kind === "cloze") {
    assert.equal(card.prompt.sentence, "They _____ great things.");
  }
});

test("a word with nothing to prompt from is not eligible", () => {
  assert.equal(isEligible(makeWord("achieve"), "id"), false);
  assert.equal(buildCard(makeWord("achieve"), "id"), null);
});

test("cloze rejects a sentence where the word appears twice", () => {
  const word = makeWord("achieve", {
    examples: ["Achieve and achieve again."],
  });

  assert.equal(buildCloze(word), null);
  assert.equal(isEligible(word, "id"), false);
});

test("cloze rejects a sentence that is too short", () => {
  const word = makeWord("achieve", { examples: ["I achieve."] });
  assert.equal(buildCloze(word), null);
});

test("a definition that contains the headword is never shown", () => {
  const word = makeWord("achieve", {
    definition: "To achieve something.",
  });

  assert.equal(pickMode(word, "id"), null);
  assert.equal(buildCard(word, "id"), null);
});

test("a leaking definition is dropped from a translation prompt", () => {
  const word = makeWord("achieve", {
    translations: { id: ["mencapai"] },
    definition: "To achieve something.",
  });

  const card = buildCard(word, "id");
  assert.equal(card?.prompt.kind, "translation");
  if (card?.prompt.kind === "translation") {
    assert.equal(card.prompt.definition, null);
  }
});

test("a typing card never carries the expected answer", () => {
  const word = makeWord("achieve", {
    translations: { id: ["mencapai"] },
    forms: ["achieved", "achieving"],
  });

  for (const mode of ["translation", "definition", "cloze"] as const) {
    const source =
      mode === "definition"
        ? makeWord("achieve", { definition: "To succeed in something." })
        : mode === "cloze"
          ? makeWord("achieve", { examples: ["They achieve great things."] })
          : word;

    const card = buildCard(source, "id", mode);
    assert.ok(card, `${mode} should build`);
    const serialised = JSON.stringify(card.prompt);
    assert.ok(!serialised.includes("achieve"), `${mode} leaks the answer`);
    assert.ok(!("forms" in card.prompt));
  }
});

test("distractors never share a meaning with the target", () => {
  const target = makeWord("achieve", {
    translations: { id: ["mencapai"] },
    id: "target",
  });

  const pool: DistractorCandidate[] = [
    {
      id: "shared",
      word: "reach",
      partOfSpeech: "verb",
      translations: { id: ["mencapai", "menjangkau"] },
      entries: makeWord("reach").entries,
    },
    {
      id: "run",
      word: "run",
      partOfSpeech: "verb",
      translations: { id: ["lari"] },
      entries: makeWord("run").entries,
    },
    {
      id: "eat",
      word: "eat",
      partOfSpeech: "verb",
      translations: { id: ["makan"] },
      entries: makeWord("eat").entries,
    },
    {
      id: "sleep",
      word: "sleep",
      partOfSpeech: "verb",
      translations: { id: ["tidur"] },
      entries: makeWord("sleep").entries,
    },
  ];

  const picked = pickDistractors(target, pool, "id", () => 0.5);
  assert.ok(picked);
  assert.equal(picked.length, 3);
  assert.ok(!picked.some((candidate) => candidate.id === "shared"));
});

test("choice falls back to typing when there are not enough distractors", () => {
  const target = makeWord("achieve", {
    translations: { id: ["mencapai"] },
    id: "target",
  });

  const pool: DistractorCandidate[] = [
    {
      id: "run",
      word: "run",
      partOfSpeech: "verb",
      translations: { id: ["lari"] },
      entries: makeWord("run").entries,
    },
  ];

  assert.equal(pickDistractors(target, pool, "id"), null);
  const card = buildCard(target, "id", "choice", pool);
  assert.equal(card?.mode, "translation");
});

test("a choice card offers four distinct meanings", () => {
  const target = makeWord("achieve", {
    translations: { id: ["mencapai"] },
    id: "target",
  });

  const pool: DistractorCandidate[] = ["run", "eat", "sleep"].map((name) => ({
    id: name,
    word: name,
    partOfSpeech: "verb",
    translations: { id: [`arti-${name}`] },
    entries: makeWord(name).entries,
  }));

  const card = buildCard(target, "id", "choice", pool, () => 0.5);
  assert.equal(card?.mode, "choice");
  if (card?.prompt.kind === "choice") {
    assert.equal(card.prompt.options.length, 4);
    const labels = new Set(card.prompt.options.map((option) => option.label));
    assert.equal(labels.size, 4);
    assert.ok(labels.has("mencapai"));
  }
});
