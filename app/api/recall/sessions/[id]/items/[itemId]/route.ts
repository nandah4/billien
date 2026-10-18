import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import {
  getOverrideTarget,
  overrideItem,
} from "@/lib/recall/repository";

/** A wrong answer can be self-corrected only shortly after it was submitted. */
const OVERRIDE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Lets the user say "I actually knew that" on the review screen, for synonyms
 * the dictionary does not list. The item is rewritten rather than duplicated,
 * and the session counters move with it, so the fact row stays consistent.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> },
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

  const { id, itemId } = await context.params;

  try {
    const target = await getOverrideTarget(userId, id, itemId);
    if (!target) {
      return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    }

    if (target.outcome !== "wrong" || target.overridden) {
      return NextResponse.json(
        { error: "Only an unconfirmed wrong answer can be overridden." },
        { status: 409 },
      );
    }

    const age = Date.now() - Date.parse(target.finished_at);
    if (!Number.isFinite(age) || age > OVERRIDE_WINDOW_MS) {
      return NextResponse.json(
        { error: "This session is too old to override." },
        { status: 409 },
      );
    }

    const applied = await overrideItem(userId, id, itemId);
    if (!applied) {
      return NextResponse.json(
        { error: "Only an unconfirmed wrong answer can be overridden." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      data: { itemId, outcome: "correct", overridden: true },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update the attempt." },
      { status: 500 },
    );
  }
}
