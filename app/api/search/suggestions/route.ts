import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/datamuse";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ query: query.trim(), items: await getSuggestions(query) });
  } catch {
    return NextResponse.json({ error: "Unable to load suggestions." }, { status: 502 });
  }
}
