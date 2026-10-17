import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { lookupWord } from "@/lib/dictionary";
import { normalizeDictionary } from "@/lib/normalize";
import {
  deleteUserWord,
  fillWordEntries,
  getUserWord,
} from "@/lib/user-words";

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
    if (found.needsEntries) {
      try {
        const normalized = normalizeDictionary(
          await lookupWord(found.word.normalized_word),
        );
        await fillWordEntries(normalized);
        const refreshed = await getUserWord(userId, id);
        if (refreshed) return NextResponse.json({ data: refreshed.word });
      } catch (error) {
        console.error("Unable to refresh legacy word entries.", error);
      }
    }

    return NextResponse.json({ data: found.word });
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
