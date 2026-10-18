import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { eligibleWords, isDue } from "@/lib/recall/session";
import {
  listRecallWords,
  sessionTotals,
  weakestWords,
} from "@/lib/recall/repository";
import type { RecallStats } from "@/lib/recall/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Headline numbers for the profile section and the Recall header. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to see recall statistics." },
      { status: 401 },
    );
  }

  try {
    const [{ translationLanguage: language }, words] = await Promise.all([
      getUserPreferences(userId),
      listRecallWords(userId),
    ]);

    const now = new Date();
    const from = new Date(now.getTime() - WEEK_MS);

    const [totals, weakest] = await Promise.all([
      sessionTotals(userId, from, now),
      weakestWords(userId, from, now),
    ]);

    const eligible = eligibleWords(words, language);

    const stats: RecallStats = {
      dueToday: eligible.filter((word) => isDue(word, now)).length,
      trackedWords: eligible.length,
      accuracy7d: totals.items > 0 ? totals.correct / totals.items : 0,
      sessions7d: totals.sessions,
      items7d: totals.items,
      weakest,
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load recall statistics." },
      { status: 500 },
    );
  }
}
