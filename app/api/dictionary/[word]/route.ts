import { NextResponse } from "next/server";
import { lookupWord } from "@/lib/dictionary";

export async function GET(_request: Request, context: { params: Promise<{ word: string }> }) {
  const { word } = await context.params;
  try {
    return NextResponse.json({ data: await lookupWord(word) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed." },
      { status: 400 },
    );
  }
}
