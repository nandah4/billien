import "server-only";
import { sql } from "@/lib/neon";
import { streakState } from "@/lib/streak";
import { listUserStreaks } from "@/lib/user-words";
import { bucketKeys, fillSeries, type SeriesRow } from "./range.ts";
import type {
  AnalyticsData,
  AnalyticsRange,
  AnalyticsWeakWord,
} from "./types.ts";

type ActivityRow = {
  bucket: string;
  words_added: number;
  reviews: number;
};

type RecallRow = {
  bucket: string;
  sessions: number;
  cards: number;
  correct: number;
  duration_total: number;
};

type WeakRow = {
  id: string | null;
  word: string;
  items: number;
  lapses: number;
  correct: number;
};

/**
 * Activity per bucket. `generate_series` supplies every bucket in the window,
 * so a quiet day still comes back with zeros instead of disappearing.
 */
async function activitySeries(
  userId: string,
  range: AnalyticsRange,
): Promise<ActivityRow[]> {
  if (range.granularity === "day") {
    return (await sql().query(
      `select to_char(d.day, 'YYYY-MM-DD') as bucket,
              coalesce(sum(s.learned_count), 0)::int as words_added,
              coalesce(sum(s.review_count), 0)::int as reviews
       from generate_series($2::date, $3::date, interval '1 day') as d(day)
       left join public.user_streaks s
         on s.user_id = $1::uuid and s.activity_date = d.day
       group by d.day
       order by d.day`,
      [userId, range.from, range.to],
    )) as ActivityRow[];
  }

  return (await sql().query(
    `select to_char(d.month, 'YYYY-MM') as bucket,
            coalesce(sum(s.learned_count), 0)::int as words_added,
            coalesce(sum(s.review_count), 0)::int as reviews
     from generate_series(
            date_trunc('month', $2::date),
            date_trunc('month', $3::date),
            interval '1 month'
          ) as d(month)
     left join public.user_streaks s
       on s.user_id = $1::uuid
      and date_trunc('month', s.activity_date) = d.month
     group by d.month
     order by d.month`,
    [userId, range.from, range.to],
  )) as ActivityRow[];
}

/** Recall sessions per bucket, grouped by the activity zone's calendar. */
async function recallSeries(
  userId: string,
  range: AnalyticsRange,
): Promise<RecallRow[]> {
  if (range.granularity === "day") {
    return (await sql().query(
      `select to_char(d.day, 'YYYY-MM-DD') as bucket,
              count(s.id)::int as sessions,
              coalesce(sum(s.card_count), 0)::int as cards,
              coalesce(sum(s.correct_count + s.almost_count), 0)::int as correct,
              coalesce(sum(s.duration_ms), 0)::int as duration_total
       from generate_series($2::date, $3::date, interval '1 day') as d(day)
       left join public.recall_sessions s
         on s.user_id = $1::uuid
        and (s.finished_at at time zone $4)::date = d.day
       group by d.day
       order by d.day`,
      [userId, range.from, range.to, range.timeZone],
    )) as RecallRow[];
  }

  return (await sql().query(
    `select to_char(d.month, 'YYYY-MM') as bucket,
            count(s.id)::int as sessions,
            coalesce(sum(s.card_count), 0)::int as cards,
            coalesce(sum(s.correct_count + s.almost_count), 0)::int as correct,
            coalesce(sum(s.duration_ms), 0)::int as duration_total
     from generate_series(
            date_trunc('month', $2::date),
            date_trunc('month', $3::date),
            interval '1 month'
          ) as d(month)
     left join public.recall_sessions s
       on s.user_id = $1::uuid
      and date_trunc('month', s.finished_at at time zone $4) = d.month
     group by d.month
     order by d.month`,
    [userId, range.from, range.to, range.timeZone],
  )) as RecallRow[];
}

/** Words answered at least three times in the window, worst first. */
async function weakestInRange(
  userId: string,
  range: AnalyticsRange,
): Promise<AnalyticsWeakWord[]> {
  const rows = (await sql().query(
    `select i.user_word_id as id, i.word,
            count(*)::int as items,
            count(*) filter (where i.outcome = 'wrong')::int as lapses,
            count(*) filter (where i.outcome in ('correct', 'almost'))::int as correct
     from public.recall_session_items i
     join public.recall_sessions s on s.id = i.session_id
     where s.user_id = $1::uuid
       and (s.finished_at at time zone $4)::date between $2::date and $3::date
     group by i.user_word_id, i.word
     having count(*) >= 3
     order by lapses desc,
              (count(*) filter (where i.outcome in ('correct', 'almost')))::numeric
                / count(*) asc
     limit 5`,
    [userId, range.from, range.to, range.timeZone],
  )) as WeakRow[];

  return rows.map((row) => ({
    id: row.id,
    word: row.word,
    lapses: row.lapses,
    accuracy: row.items > 0 ? row.correct / row.items : 0,
  }));
}

/**
 * One request per metric, merged in memory. The database returns the full
 * bucket list, and `fillSeries` still guarantees it, so a chart never has holes.
 */
export async function getAnalytics(
  userId: string,
  range: AnalyticsRange,
): Promise<AnalyticsData> {
  const keys = bucketKeys(range);

  const [activity, recall, streakRows, weakest] = await Promise.all([
    activitySeries(userId, range),
    recallSeries(userId, range),
    listUserStreaks(userId),
    weakestInRange(userId, range),
  ]);

  const merged = new Map<string, SeriesRow>();

  for (const row of activity) {
    merged.set(row.bucket, {
      bucket: row.bucket,
      wordsAdded: row.words_added,
      reviews: row.reviews,
    });
  }

  for (const row of recall) {
    const current = merged.get(row.bucket) ?? { bucket: row.bucket };
    merged.set(row.bucket, {
      ...current,
      recallSessions: row.sessions,
      recallCards: row.cards,
      recallCorrect: row.correct,
    });
  }

  const series = fillSeries(keys, [...merged.values()]);

  const totals = series.reduce(
    (accumulator, bucket) => ({
      wordsAdded: accumulator.wordsAdded + bucket.wordsAdded,
      reviews: accumulator.reviews + bucket.reviews,
      recallSessions: accumulator.recallSessions + bucket.recallSessions,
      recallCards: accumulator.recallCards + bucket.recallCards,
    }),
    { wordsAdded: 0, reviews: 0, recallSessions: 0, recallCards: 0 },
  );

  const recallCorrect = recall.reduce(
    (sum, row) => sum + row.correct,
    0,
  );
  const recallDuration = recall.reduce(
    (sum, row) => sum + row.duration_total,
    0,
  );

  const streak = streakState(streakRows);

  return {
    range,
    totals: {
      ...totals,
      recallAccuracy:
        totals.recallCards > 0 ? recallCorrect / totals.recallCards : null,
      averageSessionMs:
        totals.recallSessions > 0
          ? Math.round(recallDuration / totals.recallSessions)
          : null,
    },
    streak: { current: streak.current, longest: streak.longest },
    series,
    weakest,
  };
}
