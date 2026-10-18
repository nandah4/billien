import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { meaningsFor } from "@/lib/recall/cards";
import { gradeAnswer, gradeChoice } from "@/lib/recall/grade";
import {
  getRecallWordsByIds,
  getSession,
  getSessionByClientId,
  insertSession,
  type SessionItemInput,
} from "@/lib/recall/repository";
import { nextSchedule } from "@/lib/recall/schedule";
import { accuracyFor, summarize } from "@/lib/recall/summary";
import type {
  RecallMode,
  RecallOutcome,
  RecallScope,
  RecallSessionItem,
  RecallSessionResult,
} from "@/lib/recall/types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES: RecallMode[] = ["translation", "definition", "cloze", "choice"];
const SCOPES: RecallScope[] = ["due", "all", "weak"];
const MAX_ITEMS = 500;
const MAX_DURATION_MS = 86400000;
const MAX_ITEM_DURATION_MS = 600000;
const MAX_CLIENT_ID = 64;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

type RawItem = {
  userWordId?: unknown;
  position?: unknown;
  mode?: unknown;
  response?: unknown;
  durationMs?: unknown;
  usedHint?: unknown;
};

function clampDuration(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(Math.round(value), max))
    : null;
}

function serialize(result: {
  session: { id: string; finished_at: string };
  items: RecallSessionItem[];
}): RecallSessionResult {
  const counts = summarize(result.items.map((item) => item.outcome));
  const cardCount = result.items.length;
  return {
    id: result.session.id,
    finishedAt: result.session.finished_at,
    counts,
    accuracy: accuracyFor(counts, cardCount),
    items: result.items,
  };
}

/**
 * Submits a whole session at once. Grading, the fact row, the normalised items,
 * the per-word schedule, and today's activity counter are written together, so
 * a session can never exist half-finished. A repeated `clientSessionId` returns
 * the stored session instead of writing a second one.
 */
export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to submit a recall session." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Send a JSON body.");
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return badRequest("A session needs at least one item.");
  }
  if (rawItems.length > MAX_ITEMS) {
    return badRequest(`A session cannot exceed ${MAX_ITEMS} items.`);
  }

  const items = rawItems as RawItem[];
  const positions = new Set<number>();

  for (const item of items) {
    if (typeof item.userWordId !== "string" || !UUID.test(item.userWordId)) {
      return badRequest("Every item needs a valid userWordId.");
    }
    if (
      typeof item.position !== "number" ||
      !Number.isInteger(item.position) ||
      item.position < 0 ||
      item.position >= items.length
    ) {
      return badRequest("Every item needs a position inside the session.");
    }
    if (positions.has(item.position)) {
      return badRequest("Item positions must be unique.");
    }
    positions.add(item.position);

    if (!MODES.includes(item.mode as RecallMode)) {
      return badRequest(
        "mode must be translation, definition, cloze, or choice.",
      );
    }
  }

  const scope = SCOPES.includes(body.scope as RecallScope)
    ? (body.scope as RecallScope)
    : "due";
  const mode =
    body.mode === "auto" || MODES.includes(body.mode as RecallMode)
      ? (body.mode as RecallMode | "auto")
      : "auto";
  const clientSessionId =
    typeof body.clientSessionId === "string" &&
    body.clientSessionId.length > 0 &&
    body.clientSessionId.length <= MAX_CLIENT_ID
      ? body.clientSessionId
      : null;
  const startedAt =
    typeof body.startedAt === "string" &&
    !Number.isNaN(Date.parse(body.startedAt))
      ? new Date(body.startedAt)
      : new Date();
  const durationMs = clampDuration(body.durationMs, MAX_DURATION_MS);

  try {
    // A retried request must not count twice.
    if (clientSessionId) {
      const existing = await getSessionByClientId(userId, clientSessionId);
      if (existing) return NextResponse.json({ data: serialize(existing) });
    }

    const userWordIds = items.map((item) => item.userWordId as string);
    const { translationLanguage: language } = await getUserPreferences(userId);
    const words = await getRecallWordsByIds(userId, userWordIds, language);
    if (words.size !== new Set(userWordIds).size) {
      return NextResponse.json(
        { error: "Remembered word not found." },
        { status: 404 },
      );
    }

    const now = new Date();

    const graded: SessionItemInput[] = [];
    for (const raw of items) {
      const wordId = raw.userWordId as string;
      const word = words.get(wordId);
      if (!word) {
        return NextResponse.json(
          { error: "Remembered word not found." },
          { status: 404 },
        );
      }

      const itemMode = raw.mode as RecallMode;
      const response = typeof raw.response === "string" ? raw.response : "";
      const usedHint = raw.usedHint === true;
      const itemDuration = clampDuration(raw.durationMs, MAX_ITEM_DURATION_MS);

      const outcome: RecallOutcome =
        itemMode === "choice"
          ? gradeChoice(response, meaningsFor(word, language))
          : gradeAnswer(response, {
              word: word.word,
              forms: word.entries.flatMap((entry) =>
                (entry.forms ?? []).map((form) => form.word),
              ),
            });

      const schedule = nextSchedule(
        outcome,
        { streak: word.recallStreak, lapses: word.recallLapses },
        { durationMs: itemDuration, usedHint },
        now,
      );

      graded.push({
        itemId: randomUUID(),
        userWordId: wordId,
        position: raw.position as number,
        mode: itemMode,
        outcome,
        response: response.length > 0 ? response : null,
        expected: word.word,
        word: word.word,
        durationMs: itemDuration,
        usedHint,
        streak: schedule.streak,
        lapses: schedule.lapses,
        dueAt: schedule.dueAt,
      });
    }

    graded.sort((a, b) => a.position - b.position);

    const sessionId = randomUUID();
    const inserted = await insertSession({
      id: sessionId,
      userId,
      scope,
      mode,
      requestedSize: items.length,
      durationMs,
      startedAt,
      clientSessionId,
      items: graded,
    });

    // A null id means the unique index swallowed a duplicate that raced past
    // the lookup above. Report the stored session instead of a second write.
    if (!inserted) {
      const existing = clientSessionId
        ? await getSessionByClientId(userId, clientSessionId)
        : null;
      if (!existing) {
        return NextResponse.json(
          { error: "Unable to record the session." },
          { status: 500 },
        );
      }
      return NextResponse.json({ data: serialize(existing) });
    }

    const stored = await getSession(userId, inserted);
    if (stored) return NextResponse.json({ data: serialize(stored) });

    // The row was written but cannot be read back; report the graded items so
    // the user still sees the review instead of a blank screen.
    const counts = summarize(graded.map((item) => item.outcome));
    return NextResponse.json({
      data: {
        id: inserted,
        finishedAt: new Date().toISOString(),
        counts,
        accuracy: accuracyFor(counts, graded.length),
        items: graded.map((item) => ({
          itemId: item.itemId,
          userWordId: item.userWordId,
          position: item.position,
          mode: item.mode,
          outcome: item.outcome,
          expected: item.expected,
          word: item.word,
          response: item.response,
          durationMs: item.durationMs,
          usedHint: item.usedHint,
          overridden: false,
          canOverride: item.outcome === "wrong",
        })),
      } satisfies RecallSessionResult,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to record the session." },
      { status: 500 },
    );
  }
}
