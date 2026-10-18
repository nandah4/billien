import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import { repairRecallWords } from "@/lib/recall/repair";

/**
 * Fills the data gaps that keep saved words out of Recall: rows that predate
 * the dictionary v2 migration get their entries re-fetched, and words the
 * provider cannot translate fall back to the AI cache.
 *
 * It runs behind an explicit user action because it talks to the dictionary
 * provider, and a GET must stay free of side effects.
 */
export async function POST() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to repair your words." },
      { status: 401 },
    );
  }

  try {
    const { translationLanguage: language } = await getUserPreferences(userId);
    const result = await repairRecallWords(userId, language);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to repair your words." },
      { status: 500 },
    );
  }
}
