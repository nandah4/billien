import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { meaningsFor } from "@/lib/recall/cards";
import { gradeAnswer, gradeChoice } from "@/lib/recall/grade";
import {
  getAttemptByClientId,
  getRecallWord,
  insertAttempt,
  recordActivity,
} from "@/lib/recall/repository";
import { nextSchedule } from "@/lib/recall/schedule";
import type { RecallMode, RecallOutcome } from "@/lib/recall/types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES: RecallMode[] = ["translation", "definition", "cloze", "choice"];
const MAX_DURATION_MS = 600000;
const MAX_CLIENT_ID = 64;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Grades one answer, stores the attempt, and returns the new schedule. Grading
 * happens here so the client never needs the expected answer before answering.
 */
export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to record a recall attempt." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Send a JSON body.");
  }

  const userWordId =
    typeof body.userWordId === "string" ? body.userWordId : null;
  if (!userWordId || !UUID.test(userWordId)) {
    return badRequest("userWordId must be a valid id.");
  }

  const mode = body.mode as RecallMode | undefined;
  if (!mode || !MODES.includes(mode)) {
    return badRequest(
      "mode must be translation, definition, cloze, or choice.",
    );
  }

  const reveal = body.reveal === true;
  const response = typeof body.response === "string" ? body.response : null;
  if (!reveal && response === null) {
    return badRequest("Send a response, or reveal the answer.");
  }

  const durationMs =
    typeof body.durationMs === "number" && Number.isFinite(body.durationMs)
      ? Math.max(0, Math.min(Math.round(body.durationMs), MAX_DURATION_MS))
      : null;

  const usedHint = body.usedHint === true;
  const clientAttemptId =
    typeof body.clientAttemptId === "string" &&
    body.clientAttemptId.length > 0 &&
    body.clientAttemptId.length <= MAX_CLIENT_ID
      ? body.clientAttemptId
      : null;

  try {
    const word = await getRecallWord(userId, userWordId);
    if (!word) {
      return NextResponse.json(
        { error: "Remembered word not found." },
        { status: 404 },
      );
    }

    const { translationLanguage: language } = await getUserPreferences(userId);
    const translations = meaningsFor(word, language);
    const expected = word.word;

    // A retried request must not count twice; report the stored attempt.
    if (clientAttemptId) {
      const existing = await getAttemptByClientId(userId, clientAttemptId);
      if (existing) {
        return NextResponse.json({
          data: {
            attemptId: existing.id,
            outcome: existing.outcome,
            expected: existing.expected,
            word: expected,
            phonetic: word.phonetic,
            translations,
            recallStreak: word.recallStreak,
            lapses: word.recallLapses,
            nextDueAt: word.recallDueAt ?? new Date().toISOString(),
            canOverride:
              existing.outcome === "wrong" && existing.overridden === false,
          },
        });
      }
    }

    let outcome: RecallOutcome;
    if (reveal) {
      outcome = "revealed";
    } else if (mode === "choice") {
      outcome = gradeChoice(response ?? "", translations);
    } else {
      outcome = gradeAnswer(response ?? "", {
        word: expected,
        forms: word.entries.flatMap((entry) =>
          (entry.forms ?? []).map((form) => form.word),
        ),
      });
    }

    const now = new Date();
    const schedule = nextSchedule(
      outcome,
      { streak: word.recallStreak, lapses: word.recallLapses },
      { durationMs, usedHint },
      now,
    );

    const attemptId = await insertAttempt({
      userId,
      userWordId,
      mode,
      outcome,
      response: reveal ? null : response,
      expected,
      durationMs,
      usedHint,
      clientAttemptId,
      streak: schedule.streak,
      lapses: schedule.lapses,
      dueAt: schedule.dueAt,
    });

    // A null id means the unique index swallowed a duplicate that raced past
    // the lookup above. Report the stored attempt instead of a second write.
    if (!attemptId) {
      const existing = clientAttemptId
        ? await getAttemptByClientId(userId, clientAttemptId)
        : null;
      if (!existing) {
        return NextResponse.json(
          { error: "Unable to record the attempt." },
          { status: 500 },
        );
      }
      return NextResponse.json({
        data: {
          attemptId: existing.id,
          outcome: existing.outcome,
          expected: existing.expected,
          word: expected,
          phonetic: word.phonetic,
          translations,
          recallStreak: word.recallStreak,
          lapses: word.recallLapses,
          nextDueAt: word.recallDueAt ?? now.toISOString(),
          canOverride:
            existing.outcome === "wrong" && existing.overridden === false,
        },
      });
    }

    await recordActivity(userId);

    return NextResponse.json({
      data: {
        attemptId,
        outcome,
        expected,
        word: expected,
        phonetic: word.phonetic,
        translations,
        recallStreak: schedule.streak,
        lapses: schedule.lapses,
        nextDueAt: schedule.dueAt.toISOString(),
        canOverride: outcome === "wrong",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to record the attempt." },
      { status: 500 },
    );
  }
}
