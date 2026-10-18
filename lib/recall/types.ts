import type { Entry } from "@/lib/types";

/** How a card asks for the answer. */
export type RecallMode = "translation" | "definition" | "cloze" | "choice";

/**
 * What the server decided about an answer. `revealed` is gone: the session no
 * longer shows the answer before it is submitted.
 */
export type RecallOutcome = "correct" | "almost" | "wrong";

/** What a card shows. Typing modes never carry the expected answer. */
export type RecallPrompt =
  | {
      kind: "translation";
      language: string;
      words: string[];
      definition: string | null;
    }
  | { kind: "definition"; language: string; definition: string }
  | {
      kind: "cloze";
      language: string;
      sentence: string;
      definition: string | null;
    }
  | {
      kind: "choice";
      language: string;
      word: string;
      phonetic: string | null;
      options: { id: string; label: string }[];
    };

export type RecallCard = {
  id: string;
  mode: RecallMode;
  partOfSpeech: string;
  prompt: RecallPrompt;
  hint: { length: number; initial: string };
  stats: { recallStreak: number; lapses: number; reviewCount: number };
};

/** One answered card, as stored and returned after a session is submitted. */
export type RecallSessionItem = {
  itemId: string;
  userWordId: string | null;
  position: number;
  mode: RecallMode;
  outcome: RecallOutcome;
  expected: string;
  word: string;
  response: string | null;
  durationMs: number | null;
  usedHint: boolean;
  overridden: boolean;
  canOverride: boolean;
};

export type RecallSessionCounts = {
  correct: number;
  almost: number;
  wrong: number;
};

export type RecallSessionResult = {
  id: string;
  finishedAt: string;
  counts: RecallSessionCounts;
  /** `(correct + almost) / cardCount`. Derived, never stored. */
  accuracy: number;
  items: RecallSessionItem[];
};

/** The subset of a saved word the card builder needs. */
export type RecallWord = {
  id: string;
  word: string;
  phonetic: string | null;
  entries: Entry[];
  translations: Record<string, string[]>;
  recallStreak: number;
  recallLapses: number;
  reviewCount: number;
  recallDueAt: string | null;
};

export type RecallScope = "due" | "all" | "weak";

export type RecallPos = "all" | "noun" | "verb" | "adjective" | "other";

export type RecallStats = {
  dueToday: number;
  trackedWords: number;
  accuracy7d: number;
  sessions7d: number;
  items7d: number;
  /** `id` is null once the word has been un-saved; the fact keeps its snapshot. */
  weakest: {
    id: string | null;
    word: string;
    lapses: number;
    accuracy: number;
  }[];
};

/** One ready-to-render session, as returned by `GET /api/recall/session`. */
export type RecallSession = {
  scope: RecallScope;
  mode: RecallMode | "auto";
  language: string;
  /** Every word the user has saved, not just the eligible ones. */
  librarySize: number;
  /** Saved words that can actually produce a prompt. */
  eligibleCount: number;
  /** Saved words that cannot: empty entries, or nothing to prompt from. */
  ineligibleCount: number;
  totalDue: number;
  minSessionSize: number;
  defaultSessionSize: number;
  /** Sizes the start panel offers: 5, 10, 15, …, eligibleCount. */
  sizeOptions: number[];
  cards: RecallCard[];
};

/** What the client sends for one card when the session is submitted. */
export type RecallSessionAnswer = {
  userWordId: string;
  position: number;
  mode: RecallMode;
  response: string;
  durationMs: number;
  usedHint: boolean;
};
