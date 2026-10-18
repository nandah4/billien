import { NextRequest, NextResponse, after } from "next/server";
import { currentUserId } from "@/lib/auth";
import {
  ensureTranslation,
  hasDictionaryTranslation,
  readCachedTranslations,
} from "@/lib/ai-translations";
import { DictionaryError, lookupWord } from "@/lib/dictionary";
import { isSupportedLanguage } from "@/lib/language";
import { normalizeDictionary, projectSavedWordForList } from "@/lib/normalize";
import { resolveLanguage } from "@/lib/preferences";
import { listUserWords, saveWordForUser } from "@/lib/user-words";

const MAX_BACKGROUND_TRANSLATIONS = 8;

/**
 * Translation runs in `after()`, so the function has to stay alive for it. The
 * provider timeout plus one retry is about 30 seconds; this leaves headroom
 * without making a normal request wait.
 */
export const maxDuration = 60;

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

    const cached =
      language === "all"
        ? new Map<string, { words: string[]; senseIndex: number }>()
        : await readCachedTranslations(
            words.map((word) => word.normalized_word),
            language,
          );

    const data = words.map((word) => {
      const projected = projectSavedWordForList(word, language);
      if (language === "all") return projected;
      if ((projected.translations[language]?.length ?? 0) > 0) return projected;
      const ai = cached.get(word.normalized_word);
      if (!ai) return projected;
      return {
        ...projected,
        translations: { [language]: ai.words },
      };
    });

    // Fill the gaps for the next load without delaying this response. The
    // per-word claim keeps this cheap even if several tabs load at once.
    if (language !== "all") {
      const missing = words
        .filter(
          (word) =>
            !cached.has(word.normalized_word) &&
            !hasDictionaryTranslation(word.entries, language),
        )
        .slice(0, MAX_BACKGROUND_TRANSLATIONS);
      if (missing.length > 0) {
        after(async () => {
          await Promise.allSettled(
            missing.map((word) =>
              ensureTranslation(
                { word: word.normalized_word, entries: word.entries },
                language,
              ),
            ),
          );
        });
      }
    }

    return NextResponse.json({ data });
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

    // Generate the preferred-language translation in the background so saving
    // stays fast; the detail request would otherwise pay for it.
    const language = await resolveLanguage(userId);
    if (
      language !== "all" &&
      !hasDictionaryTranslation(normalized.entries, language)
    ) {
      after(async () => {
        await ensureTranslation(
          {
            word: normalized.normalized_word,
            entries: normalized.entries,
          },
          language,
        );
      });
    }

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
