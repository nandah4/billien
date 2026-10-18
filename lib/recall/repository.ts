import "server-only";
import { readCachedTranslations } from "@/lib/ai-translations";
import { sql } from "@/lib/neon";
import { ACTIVITY_TIME_ZONE } from "@/lib/streak";
import type { Entry } from "@/lib/types";
import { applyCachedTranslations } from "./merge-translations.ts";
import type {
  RecallMode,
  RecallOutcome,
  RecallScope,
  RecallSessionItem,
  RecallStats,
  RecallWord,
} from "./types.ts";

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

/**
 * Fills the preferred-language translation from the AI cache. The dictionary
 * does not translate every word, so a word saved with a generated translation
 * used to fall back to a definition-only card even though the answer was
 * already stored.
 */
async function withCachedTranslations(
  words: RecallWord[],
  language: string | undefined,
): Promise<RecallWord[]> {
  if (!language || language === "en" || words.length === 0) return words;

  const missing = words.filter(
    (word) => (word.translations[language]?.length ?? 0) === 0,
  );
  if (missing.length === 0) return words;

  const cached = await readCachedTranslations(
    missing.map((word) => word.word.trim().toLowerCase()),
    language,
  );

  return applyCachedTranslations(words, language, cached);
}

export async function listRecallWords(
  userId: string,
  language?: string,
): Promise<RecallWord[]> {
  const rows = (await sql().query(
    `select ${recallFields}
     from public.user_words uw
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where uw.user_id = $1::uuid
     order by uw.added_at desc
     limit ${MAX_SCAN}`,
    [userId],
  )) as RecallRow[];
  return withCachedTranslations(rows.map(toRecallWord), language);
}

export async function getRecallWord(
  userId: string,
  userWordId: string,
  language?: string,
): Promise<RecallWord | null> {
  const rows = (await sql().query(
    `select ${recallFields}
     from public.user_words uw
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where uw.id = $2::uuid and uw.user_id = $1::uuid`,
    [userId, userWordId],
  )) as RecallRow[];
  const words = await withCachedTranslations(rows.map(toRecallWord), language);
  return words[0] ?? null;
}

/**
 * Resolves a batch of owned words in one query. The submit route uses it to
 * grade every answer without a round-trip per card.
 */
export async function getRecallWordsByIds(
  userId: string,
  ids: string[],
  language?: string,
): Promise<Map<string, RecallWord>> {
  if (ids.length === 0) return new Map();
  const rows = (await sql().query(
    `select ${recallFields}
     from public.user_words uw
     join public.vocabulary_words vw on vw.id = uw.vocabulary_word_id
     where uw.user_id = $1::uuid and uw.id = any($2::uuid[])`,
    [userId, ids],
  )) as RecallRow[];
  const words = await withCachedTranslations(rows.map(toRecallWord), language);
  return new Map(words.map((word) => [word.id, word]));
}

export async function countUserWords(userId: string): Promise<number> {
  const rows = (await sql().query(
    `select count(*)::int as total from public.user_words where user_id = $1::uuid`,
    [userId],
  )) as { total: number }[];
  return rows[0]?.total ?? 0;
}

export type SessionItemInput = {
  itemId: string;
  userWordId: string;
  position: number;
  mode: RecallMode;
  outcome: RecallOutcome;
  response: string | null;
  expected: string;
  word: string;
  durationMs: number | null;
  usedHint: boolean;
  /** Schedule written back to `user_words` for this word. */
  streak: number;
  lapses: number;
  dueAt: Date;
};

export type SessionInput = {
  id: string;
  userId: string;
  scope: RecallScope;
  mode: RecallMode | "auto";
  requestedSize: number;
  durationMs: number | null;
  startedAt: Date;
  clientSessionId: string | null;
  items: SessionItemInput[];
};

/**
 * Writes the session fact, its items, the per-word schedule, and today's
 * activity counter in one statement, so a failure cannot leave a session whose
 * counts disagree with its items. A duplicate `clientSessionId` inserts
 * nothing and returns `null`, which makes a retried submit idempotent.
 */
export async function insertSession(
  input: SessionInput,
): Promise<string | null> {
  const counts = input.items.reduce(
    (totals, item) => {
      totals[item.outcome] += 1;
      return totals;
    },
    { correct: 0, almost: 0, wrong: 0 },
  );

  const itemIds = input.items.map((item) => item.itemId);
  const userWordIds = input.items.map((item) => item.userWordId);
  const positions = input.items.map((item) => item.position);
  const modes = input.items.map((item) => item.mode);
  const outcomes = input.items.map((item) => item.outcome);
  const responses = input.items.map((item) => item.response);
  const expected = input.items.map((item) => item.expected);
  const words = input.items.map((item) => item.word);
  const durations = input.items.map((item) => item.durationMs);
  const hints = input.items.map((item) => item.usedHint);
  const streaks = input.items.map((item) => item.streak);
  const lapses = input.items.map((item) => item.lapses);
  const dueAt = input.items.map((item) => item.dueAt.toISOString());

  const rows = (await sql().query(
    `with new_session as (
       insert into public.recall_sessions
         (id, user_id, scope, mode, requested_size, card_count,
          correct_count, almost_count, wrong_count, duration_ms,
          started_at, client_session_id)
       values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10,
               $11::timestamptz, $12)
       on conflict (user_id, client_session_id)
         where client_session_id is not null
         do nothing
       returning id
     ), new_items as (
       insert into public.recall_session_items
         (id, session_id, user_word_id, position, mode, outcome, response,
          expected, word, duration_ms, used_hint)
       select t.item_id, s.id, t.user_word_id, t.position, t.mode, t.outcome,
              t.response, t.expected, t.word, t.duration_ms, t.used_hint
       from new_session s
       cross join unnest(
         $13::uuid[], $14::uuid[], $15::int[], $16::text[], $17::text[],
         $18::text[], $19::text[], $20::text[], $21::int[], $22::boolean[]
       ) as t(item_id, user_word_id, position, mode, outcome, response,
              expected, word, duration_ms, used_hint)
       returning id
     ), new_schedule as (
       update public.user_words uw
       set recall_streak = t.streak,
           recall_lapses = t.lapses,
           recall_due_at = t.due_at,
           last_recalled_at = now(),
           review_count = uw.review_count + 1
       from unnest(
         $14::uuid[], $23::int[], $24::int[], $25::timestamptz[]
       ) as t(id, streak, lapses, due_at)
       where uw.id = t.id
         and uw.user_id = $2::uuid
         and exists (select 1 from new_session)
       returning uw.id
     ), new_activity as (
       insert into public.user_streaks
         (user_id, activity_date, learned_count, review_count)
       select $2::uuid,
              (now() at time zone $26)::date,
              0,
              $6
       where exists (select 1 from new_session)
       on conflict (user_id, activity_date) do update set
         review_count = public.user_streaks.review_count + excluded.review_count,
         updated_at = now()
       returning 1
     )
     select (select id from new_session) as session_id,
            (select count(*) from new_items) as item_count,
            (select count(*) from new_schedule) as schedule_count,
            (select count(*) from new_activity) as activity_count`,
    [
      input.id,
      input.userId,
      input.scope,
      input.mode,
      input.requestedSize,
      input.items.length,
      counts.correct,
      counts.almost,
      counts.wrong,
      input.durationMs,
      input.startedAt.toISOString(),
      input.clientSessionId,
      itemIds,
      userWordIds,
      positions,
      modes,
      outcomes,
      responses,
      expected,
      words,
      durations,
      hints,
      streaks,
      lapses,
      dueAt,
      ACTIVITY_TIME_ZONE,
    ],
  )) as { session_id: string | null }[];
  return rows[0]?.session_id ?? null;
}

type SessionRow = {
  id: string;
  card_count: number;
  correct_count: number;
  almost_count: number;
  wrong_count: number;
  finished_at: string;
};

type ItemRow = {
  id: string;
  user_word_id: string | null;
  position: number;
  mode: RecallMode;
  outcome: RecallOutcome;
  response: string | null;
  expected: string;
  word: string;
  duration_ms: number | null;
  used_hint: boolean;
  overridden: boolean;
};

function toSessionItem(row: ItemRow): RecallSessionItem {
  return {
    itemId: row.id,
    userWordId: row.user_word_id,
    position: row.position,
    mode: row.mode,
    outcome: row.outcome,
    expected: row.expected,
    word: row.word,
    response: row.response,
    durationMs: row.duration_ms,
    usedHint: row.used_hint,
    overridden: row.overridden,
    canOverride: row.outcome === "wrong" && !row.overridden,
  };
}

export async function listSessionItems(
  sessionId: string,
): Promise<RecallSessionItem[]> {
  const rows = (await sql().query(
    `select id, user_word_id, position, mode, outcome, response,
            expected, word, duration_ms, used_hint, overridden
     from public.recall_session_items
     where session_id = $1::uuid
     order by position asc`,
    [sessionId],
  )) as ItemRow[];
  return rows.map(toSessionItem);
}

export async function getSession(
  userId: string,
  sessionId: string,
): Promise<{ session: SessionRow; items: RecallSessionItem[] } | null> {
  const rows = (await sql().query(
    `select id, card_count, correct_count, almost_count, wrong_count, finished_at
     from public.recall_sessions
     where id = $1::uuid and user_id = $2::uuid`,
    [sessionId, userId],
  )) as SessionRow[];
  const session = rows[0];
  if (!session) return null;
  return { session, items: await listSessionItems(sessionId) };
}

export async function getSessionByClientId(
  userId: string,
  clientSessionId: string,
): Promise<{ session: SessionRow; items: RecallSessionItem[] } | null> {
  const rows = (await sql().query(
    `select id, card_count, correct_count, almost_count, wrong_count, finished_at
     from public.recall_sessions
     where user_id = $1::uuid and client_session_id = $2`,
    [userId, clientSessionId],
  )) as SessionRow[];
  const session = rows[0];
  if (!session) return null;
  return { session, items: await listSessionItems(session.id) };
}

export type OverrideTarget = {
  item_id: string;
  session_id: string;
  user_word_id: string | null;
  outcome: RecallOutcome;
  overridden: boolean;
  finished_at: string;
};

/** A wrong item that is still inside the override window, owned by the user. */
export async function getOverrideTarget(
  userId: string,
  sessionId: string,
  itemId: string,
): Promise<OverrideTarget | null> {
  const rows = (await sql().query(
    `select i.id as item_id, i.session_id, i.user_word_id, i.outcome,
            i.overridden, s.finished_at
     from public.recall_session_items i
     join public.recall_sessions s on s.id = i.session_id
     where i.id = $3::uuid
       and i.session_id = $2::uuid
       and s.user_id = $1::uuid`,
    [userId, sessionId, itemId],
  )) as OverrideTarget[];
  return rows[0] ?? null;
}

/**
 * Flips one wrong item to correct and moves the session's counters with it, so
 * `correct + almost + wrong` still equals `card_count`. The word is rescheduled
 * one day out, which is the same rule the schedule module uses after a
 * self-override.
 */
export async function overrideItem(
  userId: string,
  sessionId: string,
  itemId: string,
): Promise<boolean> {
  const rows = (await sql().query(
    `with target as (
       select i.id, i.session_id, i.user_word_id
       from public.recall_session_items i
       join public.recall_sessions s on s.id = i.session_id
       where i.id = $3::uuid
         and i.session_id = $2::uuid
         and s.user_id = $1::uuid
         and i.outcome = 'wrong'
         and i.overridden = false
         and s.finished_at > now() - interval '10 minutes'
     ), updated_item as (
       update public.recall_session_items i
       set outcome = 'correct', overridden = true
       from target t
       where i.id = t.id
       returning i.id, t.session_id
     ), updated_session as (
       update public.recall_sessions s
       set wrong_count = s.wrong_count - 1,
           correct_count = s.correct_count + 1
       from updated_item u
       where s.id = u.session_id
       returning s.id
     ), updated_word as (
       update public.user_words uw
       set recall_streak = greatest(uw.recall_streak, 1),
           recall_due_at = now() + interval '1 day'
       from target t
       where uw.id = t.user_word_id
       returning uw.id
     )
     select (select id from updated_item) as item_id`,
    [userId, sessionId, itemId],
  )) as { item_id: string | null }[];
  return Boolean(rows[0]?.item_id);
}

export type SessionTotals = {
  sessions: number;
  items: number;
  correct: number;
  durationMs: number | null;
};

/** Totals for a window, used by the stats endpoint and analytics. */
export async function sessionTotals(
  userId: string,
  from: Date,
  to: Date,
): Promise<SessionTotals> {
  const rows = (await sql().query(
    `select count(*)::int as sessions,
            coalesce(sum(card_count), 0)::int as items,
            coalesce(sum(correct_count + almost_count), 0)::int as correct,
            avg(duration_ms)::int as duration_ms
     from public.recall_sessions
     where user_id = $1::uuid
       and finished_at >= $2::timestamptz
       and finished_at < $3::timestamptz`,
    [userId, from.toISOString(), to.toISOString()],
  )) as {
    sessions: number;
    items: number;
    correct: number;
    duration_ms: number | null;
  }[];
  const row = rows[0];
  return {
    sessions: row?.sessions ?? 0,
    items: row?.items ?? 0,
    correct: row?.correct ?? 0,
    durationMs: row?.duration_ms ?? null,
  };
}

type WeakRow = {
  id: string | null;
  word: string;
  items: number;
  lapses: number;
  correct: number;
};

/**
 * Words answered at least three times in the window, worst first. `id` is null
 * once the word has been un-saved, because the fact row keeps its snapshot.
 */
export async function weakestWords(
  userId: string,
  from: Date,
  to: Date,
): Promise<RecallStats["weakest"]> {
  const rows = (await sql().query(
    `select i.user_word_id as id, i.word,
            count(*)::int as items,
            count(*) filter (where i.outcome = 'wrong')::int as lapses,
            count(*) filter (where i.outcome in ('correct', 'almost'))::int as correct
     from public.recall_session_items i
     join public.recall_sessions s on s.id = i.session_id
     where s.user_id = $1::uuid
       and s.finished_at >= $2::timestamptz
       and s.finished_at < $3::timestamptz
     group by i.user_word_id, i.word
     having count(*) >= 3
     order by lapses desc,
              (count(*) filter (where i.outcome in ('correct', 'almost')))::numeric
                / count(*) asc
     limit 5`,
    [userId, from.toISOString(), to.toISOString()],
  )) as WeakRow[];

  return rows.map((row) => ({
    id: row.id,
    word: row.word,
    lapses: row.lapses,
    accuracy: row.items > 0 ? row.correct / row.items : 0,
  }));
}
