import type { Entry } from "@/lib/types";

/** How a card asks for the answer. */
export type RecallMode = "translation" | "definition" | "cloze" | "choice";

/** What the server decided about an answer. */
export type RecallOutcome = "correct" | "almost" | "wrong" | "revealed";

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

export type RecallAttemptResult = {
  /** Needed by the client to offer the self-override. */
  attemptId: string;
  outcome: RecallOutcome;
  expected: string;
  word: string;
  phonetic: string | null;
  translations: string[];
  recallStreak: number;
  lapses: number;
  nextDueAt: string;
  canOverride: boolean;
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
  attempts7d: number;
  weakest: { id: string; word: string; lapses: number; accuracy: number }[];
};

/** One ready-to-render session, as returned by `GET /api/recall/session`. */
export type RecallSession = {
  mode: RecallMode | "auto";
  scope: RecallScope;
  language: string;
  /** Every word the user has saved, not just the eligible ones. */
  librarySize: number;
  minLibrarySize: number;
  totalDue: number;
  totalEligible: number;
  cards: RecallCard[];
};
