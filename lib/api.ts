import type { DictionaryResult, SavedWord, UserPreferences } from "@/lib/types";

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
