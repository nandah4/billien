import "server-only";
import type { DictionaryEntry, DictionaryPhonetic, SavedWord, StreakDay } from "@/lib/types";
import { sql } from "@/lib/neon";

type StoredWordRow = {
  id: string;
  word: string;
  normalized_word: string;
  phonetic: string | null;
  phonetics: DictionaryPhonetic[] | string | null;
  meanings: SavedWord["meanings"] | string | null;
  license: SavedWord["license"] | string | null;
  source_urls: string[] | string | null;
  api_entries: DictionaryEntry[] | string | null;
  added_at: string;
  last_reviewed_at: string | null;
  review_count: number;
  remembered_count: number;
  forgotten_count: number;
};

function jsonValue<T>(value: T | string | null, fallback: T): T {
  if (value === null) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function savedWord(row: StoredWordRow): SavedWord {
  return {
    ...row,
    phonetics: jsonValue<DictionaryPhonetic[]>(row.phonetics, []),
    meanings: jsonValue<SavedWord["meanings"]>(row.meanings, []),
    license: jsonValue<SavedWord["license"]>(row.license, null),
    source_urls: jsonValue<string[]>(row.source_urls, []),
    api_entries: jsonValue<DictionaryEntry[]>(row.api_entries, []),
  };
}

const savedWordFields = `
  user_words.id, vocabulary_words.word, vocabulary_words.normalized_word,
  vocabulary_words.phonetic, vocabulary_words.phonetics, vocabulary_words.meanings,
  vocabulary_words.license, vocabulary_words.source_urls, vocabulary_words.api_entries,
  user_words.added_at, user_words.last_reviewed_at, user_words.review_count,
  user_words.remembered_count, user_words.forgotten_count
`;

export async function listUserWords(userId: string, query?: string) {
  const rows = query
    ? await sql().query(`select ${savedWordFields} from public.user_words join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id where user_words.user_id = $1 and vocabulary_words.word ilike $2 order by user_words.added_at desc`, [userId, `%${query}%`])
    : await sql().query(`select ${savedWordFields} from public.user_words join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id where user_words.user_id = $1 order by user_words.added_at desc`, [userId]);
  return (rows as StoredWordRow[]).map(savedWord);
}

export async function saveWordForUser(userId: string, word: Omit<SavedWord, "id" | "added_at" | "last_reviewed_at" | "review_count" | "remembered_count" | "forgotten_count">) {
  const dictionaryRows = await sql().query(`
    insert into public.vocabulary_words (word, normalized_word, phonetic, phonetics, meanings, license, source_urls, api_entries)
    values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::text[], $8::jsonb)
    on conflict (normalized_word) do update set word = excluded.word
    returning id
  `, [word.word, word.normalized_word, word.phonetic, JSON.stringify(word.phonetics), JSON.stringify(word.meanings), JSON.stringify(word.license), word.source_urls, JSON.stringify(word.api_entries)]);
  const vocabularyWordId = (dictionaryRows[0] as { id: string }).id;
  const savedRows = await sql().query(`
    insert into public.user_words (user_id, vocabulary_word_id)
    values ($1::uuid, $2::uuid)
    on conflict (user_id, vocabulary_word_id) do nothing
    returning id
  `, [userId, vocabularyWordId]);
  const alreadySaved = savedRows.length === 0;
  if (!alreadySaved) await bumpActivity(userId, 1, 0);
  const rows = await sql().query(`select ${savedWordFields} from public.user_words join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id where user_words.user_id = $1::uuid and user_words.vocabulary_word_id = $2::uuid`, [userId, vocabularyWordId]);
  return { word: savedWord(rows[0] as StoredWordRow), alreadySaved };
}

export async function randomUserWords(userId: string, count: number) {
  const rows = await sql().query(`select ${savedWordFields} from public.user_words join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id where user_words.user_id = $1::uuid order by random() limit $2`, [userId, count]);
  return (rows as StoredWordRow[]).map(savedWord);
}

export async function recordReview(userId: string, userWordId: string, result: "remembered" | "forgotten") {
  const column = result === "remembered" ? "remembered_count" : "forgotten_count";
  const rows = await sql().query(`
    update public.user_words
    set review_count = review_count + 1, ${column} = ${column} + 1, last_reviewed_at = now()
    where id = $1::uuid and user_id = $2::uuid
    returning vocabulary_word_id
  `, [userWordId, userId]);
  if (rows.length === 0) return null;
  await bumpActivity(userId, 0, 1);
  const vocabularyWordId = (rows[0] as { vocabulary_word_id: string }).vocabulary_word_id;
  const updated = await sql().query(`select ${savedWordFields} from public.user_words join public.vocabulary_words on vocabulary_words.id = user_words.vocabulary_word_id where user_words.id = $1::uuid and user_words.user_id = $2::uuid and user_words.vocabulary_word_id = $3::uuid`, [userWordId, userId, vocabularyWordId]);
  return savedWord(updated[0] as StoredWordRow);
}

async function bumpActivity(userId: string, learnedIncrement: number, reviewIncrement: number) {
  await sql().query(`
    insert into public.user_streaks (user_id, activity_date, learned_count, review_count)
    values ($1::uuid, (now() at time zone 'Asia/Jakarta')::date, $2, $3)
    on conflict (user_id, activity_date) do update set
      learned_count = public.user_streaks.learned_count + excluded.learned_count,
      review_count = public.user_streaks.review_count + excluded.review_count,
      updated_at = now()
  `, [userId, learnedIncrement, reviewIncrement]);
}

export async function listUserStreaks(userId: string) {
  return await sql().query(`select activity_date, learned_count, review_count from public.user_streaks where user_id = $1::uuid order by activity_date desc`, [userId]) as StreakDay[];
}
