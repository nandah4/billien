import type { DictionaryResult, SavedWord, UserPreferences } from "@/lib/types";
import type {
  RecallScope,
  RecallSession,
  RecallStats,
} from "@/lib/recall/types";

export type ApiEnvelope<T> = {
  data: T;
  error?: string;
  alreadySaved?: boolean;
  currentStreak?: number;
};

export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong.");
  return payload;
}

export function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function dictionaryQueryOptions(word: string, language?: string) {
  const query = language ? `?lang=${encodeURIComponent(language)}` : "";
  return {
    queryKey: ["dictionary-word", word, language ?? "auto"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<DictionaryResult>>(
        `/api/dictionary/${encodeURIComponent(word)}${query}`,
        { signal },
      ),
    retry: false,
    staleTime: 1000 * 60 * 30,
    select: (response: ApiEnvelope<DictionaryResult>) => response.data,
  };
}

export function rememberedWordsQueryOptions(
  enabled: boolean,
  language?: string,
) {
  const query = language ? `?lang=${encodeURIComponent(language)}` : "";
  return {
    queryKey: ["remembered-words", language ?? "auto"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<SavedWord[]>>(`/api/words${query}`, { signal }),
    select: (response: ApiEnvelope<SavedWord[]>) => response.data,
  };
}

/** Detail always asks for every language so switching preference is instant. */
export function savedWordDetailQueryOptions(id: string | null) {
  return {
    queryKey: ["remembered-word", id],
    enabled: Boolean(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<SavedWord>>(`/api/words/${id}`, { signal }),
    select: (response: ApiEnvelope<SavedWord>) => response.data,
  };
}

export function preferencesQueryOptions(enabled: boolean) {
  return {
    queryKey: ["preferences"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<UserPreferences>>("/api/preferences", { signal }),
    select: (response: ApiEnvelope<UserPreferences>) => response.data,
  };
}

export function streakQueryOptions(enabled: boolean) {
  return {
    queryKey: ["streak"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<unknown[]>>("/api/streak", { signal }),
    select: (response: ApiEnvelope<unknown[]>) => response.currentStreak ?? 0,
  };
}

/**
 * A session is built once and played to the end, so it is never refetched
 * behind the user's back. `gcTime: 0` drops it when the tab unmounts, which is
 * what makes returning to Recall start a fresh queue.
 */
export function recallSessionQueryOptions(
  enabled: boolean,
  scope: RecallScope = "due",
) {
  return {
    queryKey: ["recall-session", scope],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<RecallSession>>(
        `/api/recall/session?scope=${scope}`,
        { signal },
      ),
    select: (response: ApiEnvelope<RecallSession>) => response.data,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  };
}

export function recallStatsQueryOptions(enabled: boolean) {
  return {
    queryKey: ["recall-stats"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<RecallStats>>("/api/recall/stats", { signal }),
    select: (response: ApiEnvelope<RecallStats>) => response.data,
  };
}
