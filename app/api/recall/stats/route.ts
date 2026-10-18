import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { isEligible } from "@/lib/recall/cards";
import {
  attemptAccuracy,
  listRecallWords,
  weakestWords,
} from "@/lib/recall/repository";
import { isDue } from "@/lib/recall/session";
import type { RecallStats } from "@/lib/recall/types";

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
    const [{ translationLanguage: language }, words, accuracy, weakest] =
      await Promise.all([
        getUserPreferences(userId),
        listRecallWords(userId),
        attemptAccuracy(userId),
        weakestWords(userId),
      ]);

    const eligible = words.filter((word) => isEligible(word, language));
    const now = new Date();

    const stats: RecallStats = {
      dueToday: eligible.filter((word) => isDue(word, now)).length,
      trackedWords: eligible.length,
      accuracy7d: accuracy.attempts > 0 ? accuracy.correct / accuracy.attempts : 0,
      attempts7d: accuracy.attempts,
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
