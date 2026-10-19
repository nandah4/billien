import type { DictionaryResult, SavedWord, UserPreferences } from "@/lib/types";
import { LANGUAGES, type LanguageOption } from "@/lib/language";
import type {
  AnalyticsData,
  AnalyticsPreset,
  Granularity,
} from "@/lib/analytics/types";
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
  limit?: number,
) {
  const params = new URLSearchParams({ scope });
  if (limit) params.set("limit", String(limit));

  return {
    queryKey: ["recall-session", scope, limit ?? "default"],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<RecallSession>>(
        `/api/recall/session?${params.toString()}`,
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

export type AnalyticsQuery = {
  preset: AnalyticsPreset;
  month?: string | null;
  granularity?: Granularity | null;
};

export function analyticsQueryOptions(enabled: boolean, query: AnalyticsQuery) {
  const params = new URLSearchParams({ preset: query.preset });
  if (query.month) params.set("month", query.month);
  if (query.granularity) params.set("granularity", query.granularity);

  return {
    queryKey: [
      "analytics",
      query.preset,
      query.month ?? "",
      query.granularity ?? "",
    ],
    enabled,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<AnalyticsData>>(
        `/api/analytics?${params.toString()}`,
        { signal },
      ),
    select: (response: ApiEnvelope<AnalyticsData>) => response.data,
    retry: false,
  };
}

/**
 * Language catalogue for the pickers. The bundled list is shown immediately as
 * placeholder data while `/api/languages` refreshes it from the free upstream,
 * so the dialog never blocks on the network.
 */
export function languagesQueryOptions() {
  return {
    queryKey: ["languages"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<LanguageOption[]>>("/api/languages", { signal }),
    select: (response: ApiEnvelope<LanguageOption[]>) => response.data,
    placeholderData: { data: LANGUAGES } as ApiEnvelope<LanguageOption[]>,
    staleTime: 60 * 60 * 1000,
    retry: false,
  };
}
