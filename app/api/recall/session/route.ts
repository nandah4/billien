import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getUserPreferences } from "@/lib/preferences";
import {
  buildCard,
  isEligible,
  type DistractorCandidate,
} from "@/lib/recall/cards";
import { countUserWords, listRecallWords } from "@/lib/recall/repository";
import {
  MIN_LIBRARY_SIZE,
  clampLimit,
  isDue,
  selectQueue,
} from "@/lib/recall/session";
import type { RecallMode, RecallPos, RecallScope } from "@/lib/recall/types";

const MODES: (RecallMode | "auto")[] = [
  "auto",
  "translation",
  "definition",
  "cloze",
  "choice",
];
const SCOPES: RecallScope[] = ["due", "all", "weak"];
const POS_VALUES: RecallPos[] = ["all", "noun", "verb", "adjective", "other"];

function pick<T extends string>(
  value: string | null,
  allowed: T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Returns a ready-to-render session. Cards never carry the expected answer for
 * typing modes, so the answer cannot be read out of the payload.
 */
export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to start a recall session." },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const mode = pick(params.get("mode"), MODES, "auto");
  const scope = pick(params.get("scope"), SCOPES, "due");
  const pos = pick(params.get("pos"), POS_VALUES, "all");
  const limit = clampLimit(Number.parseInt(params.get("limit") ?? "10", 10));

  try {
    const [{ translationLanguage: language }, words, librarySize] =
      await Promise.all([
        getUserPreferences(userId),
        listRecallWords(userId),
        countUserWords(userId),
      ]);

    const now = new Date();
    const eligible = words.filter((word) => isEligible(word, language));
    const totalDue = eligible.filter((word) => isDue(word, now)).length;

    // `choice` draws its options from the rest of the library, including words
    // that are not eligible for a typing prompt.
    const pool: DistractorCandidate[] = words.map((word) => ({
      id: word.id,
      word: word.word,
      partOfSpeech: word.entries[0]?.partOfSpeech ?? "unknown",
      translations: word.translations,
      entries: word.entries,
    }));

    const queue = selectQueue(words, { language, scope, pos, limit, now });

    const cards = queue
      .map((word) => buildCard(word, language, mode, pool))
      .filter((card) => card !== null);

    return NextResponse.json({
      data: {
        mode,
        scope,
        language,
        librarySize,
        minLibrarySize: MIN_LIBRARY_SIZE,
        totalDue,
        totalEligible: eligible.length,
        cards,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to build a recall session." },
      { status: 500 },
    );
  }
}
