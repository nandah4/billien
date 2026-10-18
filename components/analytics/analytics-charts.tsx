"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBucket, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsBucket, Granularity } from "@/lib/analytics/types";

const activityConfig = {
  wordsAdded: { label: "Words added", color: "var(--color-chart-1)" },
  reviews: { label: "Reviews", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

const accuracyConfig = {
  recallAccuracy: { label: "Accuracy", color: "var(--color-chart-3)" },
} satisfies ChartConfig;

/** Words added and reviews per bucket. */
export function ActivityChart({
  series,
  granularity,
}: {
  series: AnalyticsBucket[];
  granularity: Granularity;
}) {
  return (
    <ChartContainer config={activityConfig} className="h-[240px] w-full">
      <BarChart
        accessibilityLayer
        data={series}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatBucket(value, granularity)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                formatBucket(String(value), granularity)
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="wordsAdded"
          fill="var(--color-wordsAdded)"
          radius={4}
          maxBarSize={28}
        />
        <Bar
          dataKey="reviews"
          fill="var(--color-reviews)"
          radius={4}
          maxBarSize={28}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Recall accuracy per bucket. `connectNulls` stays off so a bucket without a
 * session reads as a gap rather than a straight line through missing data.
 */
export function AccuracyChart({
  series,
  granularity,
}: {
  series: AnalyticsBucket[];
  granularity: Granularity;
}) {
  return (
    <ChartContainer config={accuracyConfig} className="h-[200px] w-full">
      <LineChart
        accessibilityLayer
        data={series}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatBucket(value, granularity)}
        />
        <YAxis
          domain={[0, 1]}
          width={38}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                formatBucket(String(value), granularity)
              }
              formatter={(value) =>
                typeof value === "number" ? formatPercent(value) : String(value)
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="recallAccuracy"
          stroke="var(--color-recallAccuracy)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
