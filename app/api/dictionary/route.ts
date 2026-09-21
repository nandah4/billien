import { NextRequest, NextResponse } from "next/server";
import { lookupWord } from "@/lib/dictionary";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word") ?? "";
  try {
    return NextResponse.json({ data: await lookupWord(word) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed." },
      { status: 400 },
    );
  }
}
