import "server-only";
import { sql } from "@/lib/neon";
import type { Entry } from "@/lib/types";
import { bumpActivity } from "@/lib/user-words";
import type { RecallMode, RecallOutcome, RecallStats, RecallWord } from "./types.ts";

/**
 * A personal library is small, so eligibility is decided in JavaScript: it
 * depends on nested dictionary JSON that SQL would have to unpack anyway. The
 * cap only guards against a pathological library.
 */
const MAX_SCAN = 2000;

type RecallRow = {
  id: string;
  word: string;
  phonetic: string | null;
  entries: Entry[] | string | null;
  translations: Record<string, string[]> | string | null;
  review_count: number;
  recall_streak: number;
  recall_lapses: number;
  recall_due_at: string | null;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toRecallWord(row: RecallRow): RecallWord {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic,
    entries: parseJson<Entry[]>(row.entries, []),
    translations: parseJson<Record<string, string[]>>(row.translations, {}),
    recallStreak: row.recall_streak,
    recallLapses: row.recall_lapses,
    reviewCount: row.review_count,
    recallDueAt: row.recall_due_at,
  };
}

const recallFields = `
  uw.id, vw.word, vw.phonetic, vw.entries, vw.translations,
  uw.review_count, uw.recall_streak, uw.recall_lapses, uw.recall_due_at
`;

export async function listRecallWords(userId: string): Promise<RecallWord[]> {
  const rows = (await sql().query(
    `select ${recallFields}
     from public.user_words uw
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where uw.user_id = $1::uuid
     order by uw.added_at desc
     limit ${MAX_SCAN}`,
    [userId],
  )) as RecallRow[];
  return rows.map(toRecallWord);
}

export async function getRecallWord(
  userId: string,
  userWordId: string,
): Promise<RecallWord | null> {
  const rows = (await sql().query(
    `select ${recallFields}
     from public.user_words uw
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where uw.id = $2::uuid and uw.user_id = $1::uuid`,
    [userId, userWordId],
  )) as RecallRow[];
  return rows[0] ? toRecallWord(rows[0]) : null;
}

export async function countUserWords(userId: string): Promise<number> {
  const rows = (await sql().query(
    `select count(*)::int as total from public.user_words where user_id = $1::uuid`,
    [userId],
  )) as { total: number }[];
  return rows[0]?.total ?? 0;
}

export type AttemptInsert = {
  userId: string;
  userWordId: string;
  mode: RecallMode;
  outcome: RecallOutcome;
  response: string | null;
  expected: string;
  durationMs: number | null;
  usedHint: boolean;
  clientAttemptId: string | null;
  streak: number;
  lapses: number;
  dueAt: Date;
};

/**
 * Writes the attempt and the new schedule in one statement, so a partial write
 * cannot leave the log and the schedule disagreeing. A duplicate
 * `clientAttemptId` inserts nothing and returns `null`, which makes a retried
 * request idempotent.
 */
export async function insertAttempt(
  input: AttemptInsert,
): Promise<string | null> {
  const rows = (await sql().query(
    `with attempt as (
       insert into public.recall_attempts
         (user_id, user_word_id, mode, outcome, response, expected,
          duration_ms, used_hint, client_attempt_id)
       values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
       on conflict (user_id, client_attempt_id)
         where client_attempt_id is not null
         do nothing
       returning id
     ), updated as (
       update public.user_words
       set recall_streak = $10,
           recall_lapses = $11,
           recall_due_at = $12::timestamptz,
           last_recalled_at = now(),
           review_count = review_count + 1
       where id = $2::uuid
         and user_id = $1::uuid
         and exists (select 1 from attempt)
       returning id
     )
     select (select id from attempt) as attempt_id,
            (select id from updated) as updated_id`,
    [
      input.userId,
      input.userWordId,
      input.mode,
      input.outcome,
      input.response,
      input.expected,
      input.durationMs,
      input.usedHint,
      input.clientAttemptId,
      input.streak,
      input.lapses,
      input.dueAt.toISOString(),
    ],
  )) as { attempt_id: string | null }[];
  return rows[0]?.attempt_id ?? null;
}

export type StoredAttempt = {
  id: string;
  user_word_id: string;
  outcome: RecallOutcome;
  expected: string;
  overridden: boolean;
  created_at: string;
};

export async function getAttemptByClientId(
  userId: string,
  clientAttemptId: string,
): Promise<StoredAttempt | null> {
  const rows = (await sql().query(
    `select id, user_word_id, outcome, expected, overridden, created_at
     from public.recall_attempts
     where user_id = $1::uuid and client_attempt_id = $2`,
    [userId, clientAttemptId],
  )) as StoredAttempt[];
  return rows[0] ?? null;
}

export type OverrideTarget = StoredAttempt & {
  recall_streak: number;
  recall_lapses: number;
};

export async function getAttemptForOverride(
  userId: string,
  attemptId: string,
): Promise<OverrideTarget | null> {
  const rows = (await sql().query(
    `select ra.id, ra.user_word_id, ra.outcome, ra.expected, ra.overridden,
            ra.created_at, uw.recall_streak, uw.recall_lapses
     from public.recall_attempts ra
     join public.user_words uw on uw.id = ra.user_word_id
     where ra.id = $1::uuid and ra.user_id = $2::uuid`,
    [attemptId, userId],
  )) as OverrideTarget[];
  return rows[0] ?? null;
}

export async function applyOverride(
  userId: string,
  attemptId: string,
  userWordId: string,
  streak: number,
  dueAt: Date,
): Promise<{ recallStreak: number; lapses: number; dueAt: string } | null> {
  await sql().query(
    `update public.recall_attempts
     set outcome = 'correct', overridden = true
     where id = $1::uuid and user_id = $2::uuid`,
    [attemptId, userId],
  );

  const rows = (await sql().query(
    `update public.user_words
     set recall_streak = $3, recall_due_at = $4::timestamptz
     where id = $1::uuid and user_id = $2::uuid
     returning recall_streak, recall_lapses, recall_due_at`,
    [userWordId, userId, streak, dueAt.toISOString()],
  )) as {
    recall_streak: number;
    recall_lapses: number;
    recall_due_at: string | null;
  }[];

  const row = rows[0];
  if (!row) return null;
  return {
    recallStreak: row.recall_streak,
    lapses: row.recall_lapses,
    dueAt: row.recall_due_at ?? dueAt.toISOString(),
  };
}

export async function recordActivity(userId: string): Promise<void> {
  await bumpActivity(userId, 0, 1);
}

export async function attemptAccuracy(
  userId: string,
): Promise<{ attempts: number; correct: number }> {
  const rows = (await sql().query(
    `select count(*)::int as attempts,
            count(*) filter (where outcome in ('correct', 'almost'))::int as correct
     from public.recall_attempts
     where user_id = $1::uuid and created_at >= now() - interval '7 days'`,
    [userId],
  )) as { attempts: number; correct: number }[];
  return rows[0] ?? { attempts: 0, correct: 0 };
}

type WeakRow = {
  id: string;
  word: string;
  attempts: number;
  lapses: number;
  correct: number;
};

export async function weakestWords(userId: string): Promise<RecallStats["weakest"]> {
  const rows = (await sql().query(
    `select uw.id, vw.word,
            count(*)::int as attempts,
            count(*) filter (where ra.outcome = 'wrong')::int as lapses,
            count(*) filter (where ra.outcome in ('correct', 'almost'))::int as correct
     from public.recall_attempts ra
     join public.user_words uw on uw.id = ra.user_word_id
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where ra.user_id = $1::uuid
     group by uw.id, vw.word
     having count(*) >= 3
     order by (count(*) filter (where ra.outcome = 'wrong')) desc,
              (count(*) filter (where ra.outcome in ('correct', 'almost')))::numeric
                / count(*) asc
     limit 5`,
    [userId],
  )) as WeakRow[];

  return rows.map((row) => ({
    id: row.id,
    word: row.word,
    lapses: row.lapses,
    accuracy: row.attempts > 0 ? row.correct / row.attempts : 0,
  }));
}
