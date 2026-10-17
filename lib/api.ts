import type { DictionaryEntry, SavedWord } from "@/lib/types";

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

export function dictionaryQueryOptions(word: string) {
  return {
    queryKey: ["dictionary-word", word],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<DictionaryEntry[]>>(
        `/api/dictionary/${encodeURIComponent(word)}`,
        { signal },
      ),
    retry: false,
    staleTime: 1000 * 60 * 30,
    select: (response: ApiEnvelope<DictionaryEntry[]>) =>
      response.data[0] ?? null,
  };
}

export function rememberedWordsQueryOptions(enabled: boolean) {
  return {
    queryKey: ["remembered-words"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<SavedWord[]>>("/api/words", { signal }),
    select: (response: ApiEnvelope<SavedWord[]>) => response.data,
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
