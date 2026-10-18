import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics/repository";
import { resolveRange } from "@/lib/analytics/range";
import { ACTIVITY_TIME_ZONE } from "@/lib/streak";

/**
 * Activity and recall metrics for a window. `month=YYYY-MM` wins over `preset`,
 * and the granularity follows the window length unless it is passed explicitly.
 */
export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to see your analytics." },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const resolved = resolveRange({
    preset: params.get("preset"),
    month: params.get("month"),
    granularity: params.get("granularity"),
    timeZone: ACTIVITY_TIME_ZONE,
  });

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  try {
    const data = await getAnalytics(userId, resolved.range);
    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load analytics." },
      { status: 500 },
    );
  }
}
