export type AnalyticsPreset =
  | "7d"
  | "30d"
  | "90d"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year";

export type Granularity = "day" | "month";

export type AnalyticsRange = {
  from: string;
  to: string;
  granularity: Granularity;
  timeZone: string;
};

export type AnalyticsBucket = {
  bucket: string;
  wordsAdded: number;
  reviews: number;
  recallSessions: number;
  recallCards: number;
  /** `null` when the bucket had no recall session, never a fake zero. */
  recallAccuracy: number | null;
};

export type AnalyticsTotals = {
  wordsAdded: number;
  reviews: number;
  recallSessions: number;
  recallCards: number;
  recallAccuracy: number | null;
  averageSessionMs: number | null;
};

export type AnalyticsWeakWord = {
  id: string | null;
  word: string;
  lapses: number;
  accuracy: number;
};

export type AnalyticsData = {
  range: AnalyticsRange;
  totals: AnalyticsTotals;
  streak: { current: number; longest: number };
  series: AnalyticsBucket[];
  weakest: AnalyticsWeakWord[];
};
