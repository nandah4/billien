import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { applyOverride, getAttemptForOverride } from "@/lib/recall/repository";
import { overrideSchedule } from "@/lib/recall/schedule";

/** A wrong answer can be self-corrected only shortly after it happened. */
const OVERRIDE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Lets the user say "I actually knew that" after a wrong answer, for synonyms
 * the dictionary does not list. The existing attempt is rewritten rather than
 * adding a second one, so the accuracy figure stays honest.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to update an attempt." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (body.overridden !== true) {
    return NextResponse.json(
      { error: "Send { overridden: true }." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const target = await getAttemptForOverride(userId, id);
    if (!target) {
      return NextResponse.json(
        { error: "Attempt not found." },
        { status: 404 },
      );
    }

    if (target.outcome !== "wrong" || target.overridden) {
      return NextResponse.json(
        { error: "Only an unconfirmed wrong answer can be overridden." },
        { status: 409 },
      );
    }

    const age = Date.now() - Date.parse(target.created_at);
    if (!Number.isFinite(age) || age > OVERRIDE_WINDOW_MS) {
      return NextResponse.json(
        { error: "This attempt is too old to override." },
        { status: 409 },
      );
    }

    const schedule = overrideSchedule({
      streak: target.recall_streak,
      lapses: target.recall_lapses,
    });

    const updated = await applyOverride(
      userId,
      id,
      target.user_word_id,
      schedule.streak,
      schedule.dueAt,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Attempt not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        attemptId: id,
        outcome: "correct",
        overridden: true,
        recallStreak: updated.recallStreak,
        lapses: updated.lapses,
        nextDueAt: updated.dueAt,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update the attempt." },
      { status: 500 },
    );
  }
}
