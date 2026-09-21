import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryPool } from "@/lib/datamuse";
import type { DiscoverPage, DiscoveryWord } from "@/lib/types";

const PAGE_SIZE = 30;
const BUCKETS = [undefined, ..."abcdefghijklmnopqrstuvwxyz"] as const;

type Cursor = { bucketIndex: number; offset: number };

function decodeCursor(value: string | null): Cursor {
  if (!value) return { bucketIndex: 0, offset: 0 };
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || !parsed) throw new Error();
    const parsedCursor = parsed as Partial<Cursor>;
    const bucketIndex = Number(parsedCursor.bucketIndex);
    const offset = Number(parsedCursor.offset);
    if (!Number.isInteger(bucketIndex) || !Number.isInteger(offset) || bucketIndex < 0 || offset < 0) throw new Error();
    return { bucketIndex, offset };
  } catch {
    throw new Error("Invalid discovery cursor.");
  }
}

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export async function GET(request: NextRequest) {
  try {
    let { bucketIndex, offset } = decodeCursor(request.nextUrl.searchParams.get("cursor"));
    const items: DiscoveryWord[] = [];
    const seen = new Set<string>();

    while (items.length < PAGE_SIZE && bucketIndex < BUCKETS.length) {
      const pool = await getDiscoveryPool(BUCKETS[bucketIndex]);
      while (offset < pool.length && items.length < PAGE_SIZE) {
        const item = pool[offset++];
        if (!seen.has(item.word)) { seen.add(item.word); items.push(item); }
      }
      if (offset >= pool.length) { bucketIndex += 1; offset = 0; }
    }

    const hasMore = bucketIndex < BUCKETS.length;
    const data: DiscoverPage = { items, hasMore, nextCursor: hasMore ? encodeCursor({ bucketIndex, offset }) : null };
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error && error.message === "Invalid discovery cursor."
      ? error.message : "Unable to load discovery words.";
    return NextResponse.json({ error: message }, { status: message === "Invalid discovery cursor." ? 400 : 502 });
  }
}
