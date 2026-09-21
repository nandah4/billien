import { NextRequest, NextResponse } from "next/server";
import { lookupWord, normalizeForInsert } from "@/lib/dictionary";
import { currentUserId } from "@/lib/auth";
import { listUserWords, saveWordForUser } from "@/lib/user-words";

function errorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Unable to access remembered words." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to access your remembered words." }, { status: 401 });
    const q = request.nextUrl.searchParams.get("q")?.trim();
    return NextResponse.json({ data: await listUserWords(userId, q) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const word = typeof (body as { word?: unknown })?.word === "string"
      ? (body as { word: string }).word
      : "";
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to add a word to Remembered." }, { status: 401 });
    const entries = await lookupWord(word);
    const normalized = normalizeForInsert(entries);
    const saved = await saveWordForUser(userId, normalized);
    return NextResponse.json({ data: saved.word, alreadySaved: saved.alreadySaved }, { status: saved.alreadySaved ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && ["Please enter a valid English word.", "Word not found.", "Dictionary service is unavailable.", "Unexpected dictionary response."].includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
