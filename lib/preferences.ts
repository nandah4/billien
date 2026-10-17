import "server-only";
import { cookies } from "next/headers";
import { sql } from "@/lib/neon";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  normalizeLanguage,
} from "@/lib/language";
import type { UserPreferences } from "@/lib/types";

export const GUEST_LANGUAGE_COOKIE = "billien_lang";

type PreferenceRow = {
  translation_language: string;
  onboarded_at: string | null;
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const rows = await sql().query(
    `select translation_language, onboarded_at
     from public.user_preferences
     where user_id = $1::uuid`,
    [userId],
  );
  const row = rows[0] as PreferenceRow | undefined;
  if (!row) {
    return { translationLanguage: DEFAULT_LANGUAGE, onboardedAt: null };
  }
  return {
    translationLanguage: normalizeLanguage(row.translation_language),
    onboardedAt: row.onboarded_at,
  };
}

export async function saveUserPreferences(
  userId: string,
  patch: { translationLanguage?: string; onboarded?: boolean },
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const translationLanguage = isSupportedLanguage(patch.translationLanguage)
    ? patch.translationLanguage
    : current.translationLanguage;
  const onboardedAt =
    patch.onboarded === true ? (current.onboardedAt ?? new Date().toISOString()) : current.onboardedAt;

  const rows = await sql().query(
    `insert into public.user_preferences (user_id, translation_language, onboarded_at)
     values ($1::uuid, $2, $3)
     on conflict (user_id) do update set
       translation_language = excluded.translation_language,
       onboarded_at = excluded.onboarded_at,
       updated_at = now()
     returning translation_language, onboarded_at`,
    [userId, translationLanguage, onboardedAt],
  );
  const row = rows[0] as PreferenceRow;
  return {
    translationLanguage: normalizeLanguage(row.translation_language),
    onboardedAt: row.onboarded_at,
  };
}

/**
 * Preference resolution order: signed-in account → guest cookie → default.
 * Unknown values never throw; they fall back to the default language.
 */
export async function resolveLanguage(
  userId: string | null,
): Promise<string> {
  if (userId) {
    return (await getUserPreferences(userId)).translationLanguage;
  }
  const store = await cookies();
  return normalizeLanguage(store.get(GUEST_LANGUAGE_COOKIE)?.value);
}
