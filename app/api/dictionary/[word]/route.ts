import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { ensureTranslation, mergeAiTranslation } from "@/lib/ai-translations";
import { DictionaryError, lookupWord } from "@/lib/dictionary";
import { resolveFormOf } from "@/lib/form-of";
import { isSupportedLanguage } from "@/lib/language";
import {
  normalizeDictionary,
  projectDictionary,
  type NormalizedDictionary,
} from "@/lib/normalize";
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

    // A 404 is not fatal any more: the suffix rules may still find the lemma
    // (`walked` → `walk`). Any other provider failure is a real error.
    const requestedWord = word.trim().toLowerCase();
    let normalized: NormalizedDictionary | null = null;
    let missing = false;
    try {
      normalized = normalizeDictionary(await lookupWord(word));
    } catch (error) {
      if (error instanceof DictionaryError && error.status === 404) {
        missing = true;
      } else {
        throw error;
      }
    }
    if (normalized && normalized.entries.length === 0) {
      normalized = null;
      missing = true;
    }

    const form = await resolveFormOf({
      word: requestedWord,
      entries: normalized?.entries ?? [],
      missing,
    });
    if (!normalized && !form) {
      return NextResponse.json({ error: "Word not found." }, { status: 404 });
    }

    // The form's own entries only carry a gloss, so the AI must translate the
    // lemma instead. A failed lemma fetch leaves the relation but no entries.
    let entries = normalized?.entries ?? [];
    let lemma = form?.lemma ?? null;
    if (language !== "all") {
      const target = lemma ?? (form ? null : normalized);
      if (target) {
        const cached = await ensureTranslation(
          { word: target.normalized_word, entries: target.entries },
          language,
        );
        if (lemma) {
          lemma = {
            ...lemma,
            entries: mergeAiTranslation(lemma.entries, cached, language),
          };
        } else {
          entries = mergeAiTranslation(entries, cached, language);
        }
      }
    }

    const response = NextResponse.json({
      data: projectDictionary(
        {
          word: normalized?.word || requestedWord,
          entries,
          source: normalized?.source ?? null,
          formOf: form?.formOf ?? null,
          lemma: lemma
            ? {
                word: lemma.word,
                entries: lemma.entries,
                source: lemma.source,
              }
            : null,
        },
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
