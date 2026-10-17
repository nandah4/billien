import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { randomUserWords } from "@/lib/user-words";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_COUNT = 50;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawCount = Number.parseInt(params.get("count") ?? "10", 10);
  const count = Number.isFinite(rawCount)
    ? Math.max(1, Math.min(rawCount, MAX_COUNT))
    : 10;

  const rawIds = params.get("ids");
  const ids = rawIds
    ? Array.from(
        new Set(
          rawIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      )
    : [];

  if (ids.length > 0 && ids.some((id) => !UUID.test(id))) {
    return NextResponse.json(
      { error: "One or more word ids are invalid." },
      { status: 400 },
    );
  }

  try {
    const userId = await currentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to start a review." },
        { status: 401 },
      );
    }
    return NextResponse.json({
      data: await randomUserWords(
        userId,
        ids.length > 0 ? Math.min(ids.length, MAX_COUNT) : count,
        ids.length > 0 ? ids.slice(0, MAX_COUNT) : undefined,
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to start review." },
      { status: 500 },
    );
  }
}
