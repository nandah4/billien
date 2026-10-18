"use client";

import { formatBucket, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsBucket, Granularity } from "@/lib/analytics/types";
import { cardClass } from "@/lib/ui";

/**
 * The same numbers as the charts, as text. It is the accessible fallback and
 * stays readable when a chart cannot render.
 */
export function AnalyticsTable({
  series,
  granularity,
}: {
  series: AnalyticsBucket[];
  granularity: Granularity;
}) {
  return (
    <details className={`${cardClass} px-4 py-3`}>
      <summary className="cursor-pointer list-none text-[12px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        View as table
      </summary>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              <th className="py-1.5 pr-3 font-semibold">
                {granularity === "month" ? "Month" : "Date"}
              </th>
              <th className="py-1.5 pr-3 text-right font-semibold">Words</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Reviews</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Sessions</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Cards</th>
              <th className="py-1.5 text-right font-semibold">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {series.map((row) => (
              <tr key={row.bucket}>
                <td className="py-1.5 pr-3 text-ink">
                  {formatBucket(row.bucket, granularity)}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink-soft tabular-nums">
                  {row.wordsAdded}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink-soft tabular-nums">
                  {row.reviews}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink-soft tabular-nums">
                  {row.recallSessions}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink-soft tabular-nums">
                  {row.recallCards}
                </td>
                <td className="py-1.5 text-right text-ink-soft tabular-nums">
                  {formatPercent(row.recallAccuracy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
