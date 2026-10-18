import type {
  RecallCard,
  RecallScope,
  RecallSessionAnswer,
} from "./types.ts";

/**
 * A session in progress, kept in `sessionStorage` so an accidental reload or a
 * closed tab does not throw away the answers typed so far. It is scoped to the
 * tab, never sent to the server, and cleared once the session is submitted.
 */
export type RecallDraft = {
  version: 1;
  clientSessionId: string;
  startedAt: string;
  scope: RecallScope;
  limit: number;
  index: number;
  answers: Record<string, RecallSessionAnswer>;
  cards: RecallCard[];
  savedAt: string;
};

const STORAGE_KEY = "billien.recall.draft";
const VERSION = 1;
/** A draft older than this is stale; the schedule has moved on since. */
const TTL_MS = 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    // Private mode can throw on access.
    return null;
  }
}

export function readDraft(now: Date = new Date()): RecallDraft | null {
  const store = storage();
  if (!store) return null;

  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    store.removeItem(STORAGE_KEY);
    return null;
  }

  const draft = parsed as Partial<RecallDraft>;
  const valid =
    draft.version === VERSION &&
    typeof draft.clientSessionId === "string" &&
    typeof draft.startedAt === "string" &&
    Array.isArray(draft.cards) &&
    draft.cards.length > 0 &&
    typeof draft.index === "number" &&
    draft.index >= 0 &&
    draft.index < draft.cards.length &&
    typeof draft.answers === "object" &&
    draft.answers !== null &&
    typeof draft.savedAt === "string";

  if (!valid) {
    store.removeItem(STORAGE_KEY);
    return null;
  }

  const savedAt = Date.parse(draft.savedAt as string);
  if (Number.isNaN(savedAt) || now.getTime() - savedAt > TTL_MS) {
    store.removeItem(STORAGE_KEY);
    return null;
  }

  return draft as RecallDraft;
}

export function writeDraft(
  draft: Omit<RecallDraft, "version" | "savedAt">,
  now: Date = new Date(),
): void {
  const store = storage();
  if (!store) return;

  const payload: RecallDraft = {
    ...draft,
    version: VERSION,
    savedAt: now.toISOString(),
  };

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A full quota must never break the session; the draft is a convenience.
  }
}

export function clearDraft(): void {
  storage()?.removeItem(STORAGE_KEY);
}
