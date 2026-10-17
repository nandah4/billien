import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { DictionaryError, lookupWord } from "@/lib/dictionary";
import { isSupportedLanguage } from "@/lib/language";
import { normalizeDictionary, projectSavedWordForList } from "@/lib/normalize";
import { resolveLanguage } from "@/lib/preferences";
import { listUserWords, saveWordForUser } from "@/lib/user-words";

function errorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json(
    { error: "Unable to access remembered words." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to access your remembered words." },
        { status: 401 },
      );
    }

    const requested = request.nextUrl.searchParams.get("lang");
    const language =
      requested === "all"
        ? "all"
        : isSupportedLanguage(requested)
          ? requested
          : await resolveLanguage(userId);

    const query = request.nextUrl.searchParams.get("q")?.trim() || undefined;
    const words = await listUserWords(userId, query);
    return NextResponse.json({
      data: words.map((word) => projectSavedWordForList(word, language)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const word =
      typeof (body as { word?: unknown })?.word === "string"
        ? (body as { word: string }).word
        : "";

    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to add a word to Remembered." },
        { status: 401 },
      );
    }

    const normalized = normalizeDictionary(await lookupWord(word));
    if (normalized.entries.length === 0) {
      return NextResponse.json({ error: "Word not found." }, { status: 404 });
    }

    const saved = await saveWordForUser(userId, normalized);
    return NextResponse.json(
      { data: saved.word, alreadySaved: saved.alreadySaved },
      { status: saved.alreadySaved ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof DictionaryError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return errorResponse(error);
  }
}
