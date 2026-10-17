import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { isSupportedLanguage } from "@/lib/language";
import { getUserPreferences, saveUserPreferences } from "@/lib/preferences";

export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to read your preferences." },
        { status: 401 },
      );
    }
    return NextResponse.json({ data: await getUserPreferences(userId) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load preferences." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to update your preferences." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const record =
      typeof body === "object" && body !== null
        ? (body as { translationLanguage?: unknown; onboarded?: unknown })
        : {};
    const hasLanguage = record.translationLanguage !== undefined;
    const hasOnboarded = record.onboarded !== undefined;

    if (!hasLanguage && !hasOnboarded) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    if (hasLanguage && !isSupportedLanguage(record.translationLanguage)) {
      return NextResponse.json(
        { error: "Unsupported translation language." },
        { status: 400 },
      );
    }
    if (hasOnboarded && typeof record.onboarded !== "boolean") {
      return NextResponse.json(
        { error: "onboarded must be a boolean." },
        { status: 400 },
      );
    }

    const preferences = await saveUserPreferences(userId, {
      translationLanguage: hasLanguage
        ? (record.translationLanguage as string)
        : undefined,
      onboarded: record.onboarded === true,
    });
    return NextResponse.json({ data: preferences });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update preferences." },
      { status: 500 },
    );
  }
}
