import { jakartaDateKey } from "../streak.ts";
import type {
  AnalyticsBucket,
  AnalyticsPreset,
  AnalyticsRange,
  Granularity,
} from "./types.ts";

export const DEFAULT_PRESET: AnalyticsPreset = "30d";

/** The longest window the endpoint will answer. */
export const MAX_RANGE_DAYS = 366;

/** A range wider than this switches to monthly buckets. */
const DAY_GRANULARITY_LIMIT = 92;

export const PRESETS: { id: AnalyticsPreset; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
];

const PRESET_IDS = new Set(PRESETS.map((preset) => preset.id));
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isPreset(value: unknown): value is AnalyticsPreset {
  return typeof value === "string" && PRESET_IDS.has(value as AnalyticsPreset);
}

export function isGranularity(value: unknown): value is Granularity {
  return value === "day" || value === "month";
}

function parts(key: string): [number, number, number] {
  const [year, month, day] = key.split("-").map(Number);
  return [year, month, day];
}

/** Adds days to a `YYYY-MM-DD` key without involving the local time zone. */
export function addDays(key: string, delta: number): string {
  const [year, month, day] = parts(key);
  return new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
}

/** Inclusive day count between two keys. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.round((end - start) / DAY_MS) + 1;
}

export function startOfMonth(key: string): string {
  const [year, month] = parts(key);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function endOfMonth(key: string): string {
  const [year, month] = parts(key);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function startOfYear(key: string): string {
  return `${parts(key)[0]}-01-01`;
}

export function endOfYear(key: string): string {
  return `${parts(key)[0]}-12-31`;
}

/**
 * Bucket size for a window. Anything up to a quarter reads best per day;
 * longer windows would produce hundreds of bars, so they group by month.
 */
export function pickGranularity(from: string, to: string): Granularity {
  return daysBetween(from, to) <= DAY_GRANULARITY_LIMIT ? "day" : "month";
}

export type RangeInput = {
  preset?: string | null;
  month?: string | null;
  granularity?: string | null;
  timeZone: string;
};

export type RangeResult =
  | { ok: true; range: AnalyticsRange }
  | { ok: false; error: string };

function windowForPreset(
  preset: AnalyticsPreset,
  today: string,
): { from: string; to: string } {
  switch (preset) {
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "this-month":
      return { from: startOfMonth(today), to: today };
    case "last-month": {
      const lastMonth = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case "this-year":
      return { from: startOfYear(today), to: today };
    case "last-year": {
      const lastYear = `${Number(parts(today)[0]) - 1}-06-15`;
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
    case "30d":
    default:
      return { from: addDays(today, -29), to: today };
  }
}

/**
 * Resolves the requested window. `month=YYYY-MM` wins over the preset, because
 * it is the more specific choice, and may point at any past month.
 */
export function resolveRange(
  input: RangeInput,
  now: Date = new Date(),
): RangeResult {
  const today = jakartaDateKey(now);

  let from: string;
  let to: string;

  if (typeof input.month === "string" && input.month.length > 0) {
    const match = MONTH_PATTERN.exec(input.month);
    if (!match) return { ok: false, error: "month must be YYYY-MM." };
    const monthKey = `${match[1]}-${match[2]}-01`;
    from = startOfMonth(monthKey);
    to = endOfMonth(monthKey);
  } else {
    const preset = isPreset(input.preset) ? input.preset : DEFAULT_PRESET;
    const window = windowForPreset(preset, today);
    from = window.from;
    to = window.to;
  }

  const span = daysBetween(from, to);
  if (span > MAX_RANGE_DAYS) {
    return {
      ok: false,
      error: `A range cannot exceed ${MAX_RANGE_DAYS} days.`,
    };
  }
  if (span < 1) return { ok: false, error: "The range is empty." };

  const granularity = isGranularity(input.granularity)
    ? input.granularity
    : pickGranularity(from, to);

  return {
    ok: true,
    range: { from, to, granularity, timeZone: input.timeZone },
  };
}

/** Every bucket key in the window, including ones with no activity. */
export function bucketKeys(range: AnalyticsRange): string[] {
  if (range.granularity === "day") {
    const keys: string[] = [];
    for (
      let cursor = range.from;
      cursor <= range.to;
      cursor = addDays(cursor, 1)
    ) {
      keys.push(cursor);
    }
    return keys;
  }

  const keys: string[] = [];
  let cursor = startOfMonth(range.from);
  const last = startOfMonth(range.to);

  while (cursor <= last) {
    keys.push(cursor.slice(0, 7));
    const [year, month] = parts(cursor);
    const next = new Date(Date.UTC(year, month, 1));
    cursor = next.toISOString().slice(0, 10);
  }

  return keys;
}

export type SeriesRow = {
  bucket: string;
  wordsAdded?: number;
  reviews?: number;
  recallSessions?: number;
  recallCards?: number;
  recallCorrect?: number;
};

/**
 * Expands sparse rows into one entry per bucket. A bucket without a recall
 * session reports `recallAccuracy: null`, so the chart shows a gap instead of a
 * misleading zero.
 */
export function fillSeries(
  keys: string[],
  rows: SeriesRow[],
): AnalyticsBucket[] {
  const byKey = new Map(rows.map((row) => [row.bucket, row]));

  return keys.map((key) => {
    const row = byKey.get(key);
    const recallCards = row?.recallCards ?? 0;
    const recallCorrect = row?.recallCorrect ?? 0;

    return {
      bucket: key,
      wordsAdded: row?.wordsAdded ?? 0,
      reviews: row?.reviews ?? 0,
      recallSessions: row?.recallSessions ?? 0,
      recallCards,
      recallAccuracy: recallCards > 0 ? recallCorrect / recallCards : null,
    };
  });
}
