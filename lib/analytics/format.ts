import type { Granularity } from "./types.ts";

/** `2026-10-18` becomes "18 Oct"; `2026-10` becomes "Oct 26". */
export function formatBucket(value: string, granularity: Granularity): string {
  const iso =
    granularity === "month" ? `${value}-01T00:00:00Z` : `${value}T00:00:00Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    day: granularity === "day" ? "numeric" : undefined,
    month: "short",
    year: granularity === "month" ? "2-digit" : undefined,
  }).format(date);
}

/** `null` stays a dash: a bucket with no sessions has no accuracy. */
export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
