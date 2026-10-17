import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { ensureTranslation, mergeAiTranslation } from "@/lib/ai-translations";
import { lookupWord } from "@/lib/dictionary";
import { normalizeDictionary } from "@/lib/normalize";
import { resolveLanguage } from "@/lib/preferences";
import { deleteUserWord, fillWordEntries, getUserWord } from "@/lib/user-words";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to open a remembered word." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const found = await getUserWord(userId, id);
    if (!found) {
      return NextResponse.json(
        { error: "Remembered word not found." },
        { status: 404 },
      );
    }

    // Legacy rows are re-fetched once, on first open. A provider failure must
    // never hide the row the user already owns.
    let word = found.word;
    if (found.needsEntries) {
      try {
        const normalized = normalizeDictionary(
          await lookupWord(found.word.normalized_word),
        );
        await fillWordEntries(normalized);
        const refreshed = await getUserWord(userId, id);
        if (refreshed) word = refreshed.word;
      } catch (error) {
        console.error("Unable to refresh legacy word entries.", error);
      }
    }

    // This response carries every language, so the AI fallback only fills the
    // user's preferred one; the rest stay available from the dictionary.
    const language = await resolveLanguage(userId);
    const cached = await ensureTranslation(
      { word: word.normalized_word, entries: word.entries },
      language,
    );
    if (cached) {
      word = {
        ...word,
        entries: mergeAiTranslation(word.entries, cached, language),
      };
    }

    return NextResponse.json({ data: word });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to open this word." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to remove a remembered word." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const deleted = await deleteUserWord(userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Remembered word not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { id: deleted } });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to remove this word." },
      { status: 500 },
    );
  }
}
