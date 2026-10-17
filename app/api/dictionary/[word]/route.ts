import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { ensureTranslation, mergeAiTranslation } from "@/lib/ai-translations";
import { DictionaryError, lookupWord } from "@/lib/dictionary";
import { isSupportedLanguage } from "@/lib/language";
import { normalizeDictionary, projectDictionary } from "@/lib/normalize";
import { GUEST_LANGUAGE_COOKIE, resolveLanguage } from "@/lib/preferences";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ word: string }> },
) {
  const { word } = await context.params;
  try {
    const userId = await currentUserId();
    const requested = request.nextUrl.searchParams.get("lang");
    const language =
      requested === "all"
        ? "all"
        : isSupportedLanguage(requested)
          ? requested
          : await resolveLanguage(userId);

    const normalized = normalizeDictionary(await lookupWord(word));

    // Dictionary data wins. Only when the requested language is missing do we
    // ask the AI fallback, and only for a single language.
    let entries = normalized.entries;
    if (language !== "all") {
      const cached = await ensureTranslation(
        { word: normalized.normalized_word, entries },
        language,
      );
      entries = mergeAiTranslation(entries, cached, language);
    }

    const response = NextResponse.json({
      data: projectDictionary(
        { word: normalized.word, entries, source: normalized.source },
        language,
      ),
    });

    // Remember an explicit guest choice so the next request resolves it on the
    // server without a round-trip to the account preferences.
    if (!userId && isSupportedLanguage(requested)) {
      response.cookies.set(GUEST_LANGUAGE_COOKIE, requested, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    if (error instanceof DictionaryError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
