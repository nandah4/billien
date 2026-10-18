import "server-only";
import type {
  DictionarySource,
  Entry,
  SavedWord,
  StreakDay,
  WordForm,
} from "@/lib/types";
import type { NormalizedDictionary } from "@/lib/normalize";
import { sql } from "@/lib/neon";
import { currentStreak } from "@/lib/streak";

type StoredWordRow = {
  id: string;
  word: string;
  normalized_word: string;
  phonetic: string | null;
  entries: Entry[] | string | null;
  translations: Record<string, string[]> | string | null;
  forms: WordForm[] | string | null;
  source: DictionarySource | string | null;
  added_at: string;
  last_reviewed_at: string | null;
  review_count: number;
  remembered_count: number;
  forgotten_count: number;
};

function jsonValue<T>(value: T | string | null, fallback: T): T {
  if (value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function savedWord(row: StoredWordRow): SavedWord {
  return {
    ...row,
    entries: jsonValue<Entry[]>(row.entries, []),
    translations: jsonValue<Record<string, string[]>>(row.translations, {}),
    forms: jsonValue<WordForm[]>(row.forms, []),
    source: jsonValue<DictionarySource | null>(row.source, null),
  };
}

const savedWordFields = `
  user_words.id, vocabulary_words.word, vocabulary_words.normalized_word,
  vocabulary_words.phonetic, vocabulary_words.entries,
  vocabulary_words.translations, vocabulary_words.forms, vocabulary_words.source,
  user_words.added_at, user_words.last_reviewed_at, user_words.review_count,
  user_words.remembered_count, user_words.forgotten_count
`;

export async function listUserWords(userId: string, query?: string) {
  const rows = query
    ? await sql().query(
        `select ${savedWordFields}
         from public.user_words
         join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
         where user_words.user_id = $1::uuid and vocabulary_words.word ilike $2
         order by user_words.added_at desc`,
        [userId, `%${query}%`],
      )
    : await sql().query(
        `select ${savedWordFields}
         from public.user_words
         join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
         where user_words.user_id = $1::uuid
         order by user_words.added_at desc`,
        [userId],
      );
  return (rows as StoredWordRow[]).map(savedWord);
}

/**
 * One word owned by the user. `needsEntries` tells the detail route that the
 * row predates the dictionary v2 migration and should be re-fetched.
 */
export async function getUserWord(userId: string, id: string) {
  const rows = await sql().query(
    `select ${savedWordFields}
     from public.user_words
     join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
     where user_words.id = $1::uuid and user_words.user_id = $2::uuid`,
    [id, userId],
  );
  const row = rows[0] as StoredWordRow | undefined;
  if (!row) return null;
  const word = savedWord(row);
  return { word, needsEntries: word.entries.length === 0 };
}

/**
 * Fills the v2 columns for a row that still has an empty `entries` array.
 * The guard makes concurrent requests idempotent: only the first update wins.
 */
export async function fillWordEntries(normalized: NormalizedDictionary) {
  await sql().query(
    `update public.vocabulary_words
     set entries = $2::jsonb,
         translations = $3::jsonb,
         forms = $4::jsonb,
         source = $5::jsonb,
         phonetic = $6,
         entries_fetched_at = now()
     where normalized_word = $1 and jsonb_array_length(entries) = 0`,
    [
      normalized.normalized_word,
      JSON.stringify(normalized.entries),
      JSON.stringify(normalized.translations),
      JSON.stringify(normalized.forms),
      normalized.source ? JSON.stringify(normalized.source) : null,
      normalized.phonetic,
    ],
  );
}

export async function saveWordForUser(
  userId: string,
  word: NormalizedDictionary,
) {
  const dictionaryRows = await sql().query(
    `insert into public.vocabulary_words
       (word, normalized_word, phonetic, entries, translations, forms, source, entries_fetched_at)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, now())
     on conflict (normalized_word) do update set word = excluded.word
     returning id`,
    [
      word.word,
      word.normalized_word,
      word.phonetic,
      JSON.stringify(word.entries),
      JSON.stringify(word.translations),
      JSON.stringify(word.forms),
      word.source ? JSON.stringify(word.source) : null,
    ],
  );
  const vocabularyWordId = (dictionaryRows[0] as { id: string }).id;

  const savedRows = await sql().query(
    `insert into public.user_words (user_id, vocabulary_word_id)
     values ($1::uuid, $2::uuid)
     on conflict (user_id, vocabulary_word_id) do nothing
     returning id`,
    [userId, vocabularyWordId],
  );
  const alreadySaved = savedRows.length === 0;
  if (!alreadySaved) await bumpActivity(userId, 1, 0);

  const rows = await sql().query(
    `select ${savedWordFields}
     from public.user_words
     join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
     where user_words.user_id = $1::uuid and user_words.vocabulary_word_id = $2::uuid`,
    [userId, vocabularyWordId],
  );
  return { word: savedWord(rows[0] as StoredWordRow), alreadySaved };
}

/**
 * Removes only the user ↔ word relation. The shared dictionary row and the
 * day's `learned_count` stay intact so other users and the streak history are
 * unaffected.
 */
export async function deleteUserWord(userId: string, id: string) {
  const rows = await sql().query(
    `delete from public.user_words
     where id = $1::uuid and user_id = $2::uuid
     returning id`,
    [id, userId],
  );
  return (rows[0] as { id: string } | undefined)?.id ?? null;
}

export async function randomUserWords(
  userId: string,
  count: number,
  ids?: string[],
) {
  if (ids && ids.length > 0) {
    const rows = await sql().query(
      `select ${savedWordFields}
       from public.user_words
       join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
       where user_words.user_id = $1::uuid and user_words.id = any($2::uuid[])
       order by random()
       limit $3`,
      [userId, ids, count],
    );
    return (rows as StoredWordRow[]).map(savedWord);
  }

  const rows = await sql().query(
    `select ${savedWordFields}
     from public.user_words
     join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
     where user_words.user_id = $1::uuid
     order by random()
     limit $2`,
    [userId, count],
  );
  return (rows as StoredWordRow[]).map(savedWord);
}

export async function getUserSummary(userId: string) {
  const [countRows, streakRows] = await Promise.all([
    sql().query(
      `select count(*)::int as saved_count from public.user_words where user_id = $1::uuid`,
      [userId],
    ),
    listUserStreaks(userId),
  ]);
  return {
    savedCount: (countRows[0] as { saved_count: number }).saved_count,
    currentStreak: currentStreak(streakRows),
  };
}

export async function recordReview(
  userId: string,
  userWordId: string,
  result: "remembered" | "forgotten",
) {
  const column =
    result === "remembered" ? "remembered_count" : "forgotten_count";
  const rows = await sql().query(
    `update public.user_words
     set review_count = review_count + 1, ${column} = ${column} + 1, last_reviewed_at = now()
     where id = $1::uuid and user_id = $2::uuid
     returning vocabulary_word_id`,
    [userWordId, userId],
  );
  if (rows.length === 0) return null;
  await bumpActivity(userId, 0, 1);
  const vocabularyWordId = (rows[0] as { vocabulary_word_id: string })
    .vocabulary_word_id;
  const updated = await sql().query(
    `select ${savedWordFields}
     from public.user_words
     join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id
     where user_words.id = $1::uuid and user_words.user_id = $2::uuid
       and user_words.vocabulary_word_id = $3::uuid`,
    [userWordId, userId, vocabularyWordId],
  );
  return savedWord(updated[0] as StoredWordRow);
}

/**
 * Adds to today's activity counters. `learnedIncrement` counts words added,
 * `reviewIncrement` counts reviewed words. Exported so the recall engine can
 * record an attempt without duplicating the upsert.
 */
export async function bumpActivity(
  userId: string,
  learnedIncrement: number,
  reviewIncrement: number,
) {
  await sql().query(
    `insert into public.user_streaks (user_id, activity_date, learned_count, review_count)
     values ($1::uuid, (now() at time zone 'Asia/Jakarta')::date, $2, $3)
     on conflict (user_id, activity_date) do update set
       learned_count = public.user_streaks.learned_count + excluded.learned_count,
       review_count = public.user_streaks.review_count + excluded.review_count,
       updated_at = now()`,
    [userId, learnedIncrement, reviewIncrement],
  );
}

export async function listUserStreaks(userId: string) {
  return (await sql().query(
    `select activity_date, learned_count, review_count
     from public.user_streaks
     where user_id = $1::uuid
     order by activity_date desc`,
    [userId],
  )) as StreakDay[];
}
