import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { listUserStreaks } from "@/lib/user-words";
import type { StreakDay } from "@/lib/types";

function jakartaDateKey(date = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function previousDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

function currentStreak(rows: StreakDay[]) {
  const active = new Set(rows.filter((row) => row.learned_count > 0 || row.review_count > 0).map((row) => row.activity_date));
  let cursor = jakartaDateKey();
  if (!active.has(cursor)) cursor = previousDateKey(cursor);
  let streak = 0;
  while (active.has(cursor)) { streak += 1; cursor = previousDateKey(cursor); }
  return streak;
}

export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to see your streak." }, { status: 401 });
    const rows = await listUserStreaks(userId) as StreakDay[];
    return NextResponse.json({ data: rows, currentStreak: currentStreak(rows) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load streak." }, { status: 500 });
  }
}
