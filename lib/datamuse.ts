import type { DiscoveryWord } from "@/lib/types";

const BASE_URL = "https://api.datamuse.com";
const DISCOVERY_CACHE_SECONDS = 60 * 60 * 24;
const SUGGESTION_CACHE_SECONDS = 60 * 5;
const TIMEOUT_MS = 8_000;

type DatamuseResponseItem = { word?: unknown; score?: unknown };

function normalizeItems(data: unknown): DiscoveryWord[] {
  if (!Array.isArray(data)) throw new Error("Unexpected discovery response.");
  const seen = new Set<string>();
  return data.flatMap((item): DiscoveryWord[] => {
    if (!item || typeof item !== "object") return [];
    const { word, score } = item as DatamuseResponseItem;
    const normalized = typeof word === "string" ? word.trim().toLowerCase() : "";
    if (!/^[a-z][a-z'-]*$/i.test(normalized) || seen.has(normalized)) return [];
    seen.add(normalized);
    return [{ word: normalized, score: typeof score === "number" ? score : 0 }];
  });
}

async function requestDatamuse(path: "/words" | "/sug", params: URLSearchParams, revalidate: number) {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error("Discovery service is unavailable.");
  }
  if (!response.ok) throw new Error("Discovery service is unavailable.");
  return normalizeItems(await response.json());
}

export async function getDiscoveryPool(prefix?: string) {
  const params = new URLSearchParams({ max: "1000" });
  if (prefix) params.set("sp", `${prefix}*`);
  return requestDatamuse("/words", params, DISCOVERY_CACHE_SECONDS);
}

export async function getSuggestions(rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];
  const params = new URLSearchParams({ s: query, max: "10" });
  return requestDatamuse("/sug", params, SUGGESTION_CACHE_SECONDS);
}
