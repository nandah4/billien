import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { listUserStreaks } from "@/lib/user-words";
import { currentStreak } from "@/lib/streak";
import type { StreakDay } from "@/lib/types";

export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to see your streak." },
        { status: 401 },
      );
    }
    const rows = (await listUserStreaks(userId)) as StreakDay[];
    return NextResponse.json({
      data: rows,
      currentStreak: currentStreak(rows),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load streak." },
      { status: 500 },
    );
  }
}
