import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { randomUserWords } from "@/lib/user-words";

export async function GET(request: NextRequest) {
  const raw = Number.parseInt(request.nextUrl.searchParams.get("count") ?? "10", 10);
  const count = Number.isFinite(raw) ? Math.max(1, Math.min(raw, 50)) : 10;
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to start a review." }, { status: 401 });
    return NextResponse.json({ data: await randomUserWords(userId, count) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to start review." }, { status: 500 });
  }
}
