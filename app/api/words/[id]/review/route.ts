import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { recordReview } from "@/lib/user-words";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body: unknown = await request.json();
    const result = (body as { result?: unknown })?.result;
    if (result !== "remembered" && result !== "forgotten") {
      return NextResponse.json({ error: "Review result must be remembered or forgotten." }, { status: 400 });
    }
    const { id } = await context.params;
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to record a review." }, { status: 401 });
    const updated = await recordReview(userId, id, result);
    if (!updated) return NextResponse.json({ error: "Remembered word not found." }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to record review." }, { status: 500 });
  }
}
