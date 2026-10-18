"use client";

import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBucket } from "@/lib/analytics/format";
import type { AnalyticsBucket } from "@/lib/analytics/types";

const config = {
  wordsAdded: { label: "Words added", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

/**
 * Today's word count as the headline, with the last week behind it so the
 * number has context. The final bar is the current day and takes the accent
 * colour.
 */
export function TodayWordsChart({
  series,
  isLoading,
}: {
  series: AnalyticsBucket[];
  isLoading: boolean;
}) {
  const today = series.at(-1);
  const added = today?.wordsAdded ?? 0;

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
        Words today
      </p>
      <p className="mt-1 text-[32px] leading-none font-semibold text-ink tabular-nums">
        {isLoading ? "—" : added}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        {added === 1 ? "word added" : "words added"} · last 7 days
      </p>

      <ChartContainer
        config={config}
        className="mt-3 h-[92px] min-h-[92px] w-full"
      >
        <BarChart
          data={series}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          accessibilityLayer
        >
          <XAxis dataKey="bucket" hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatBucket(String(value), "day")}
              />
            }
          />
          <Bar dataKey="wordsAdded" radius={3} maxBarSize={22}>
            {series.map((entry, index) => (
              <Cell
                key={entry.bucket}
                fill={
                  index === series.length - 1
                    ? "var(--color-accent)"
                    : "var(--color-chart-1)"
                }
                fillOpacity={index === series.length - 1 ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
