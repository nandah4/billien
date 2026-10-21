import "server-only";
import { env } from "@/lib/env";
import type { RawDictionary } from "@/lib/normalize";
import { isValidWordQuery, normalizeWordQuery } from "@/lib/word-query";

export class DictionaryError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DictionaryError";
    this.status = status;
  }
}

/**
 * Fetches the raw provider payload. Validation is intentionally shallow: the
 * normalizer owns shaping, while this function owns transport errors and the
 * word format contract shared by every route.
 */
export async function lookupWord(rawWord: string): Promise<RawDictionary> {
  const word = normalizeWordQuery(rawWord);
  if (!isValidWordQuery(word)) {
    throw new DictionaryError(
      "Please enter a valid English word or phrase.",
      400,
    );
  }

  // Resolve configuration before the try: a missing variable must surface as a
  // configuration error, not as a provider timeout.
  const baseUrl = env.dictionary.baseUrl();
  const timeoutMs = env.dictionary.timeoutMs();

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/${encodeURIComponent(word)}?translations=true`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 },
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    throw new DictionaryError(
      "Dictionary request timed out. Please try again.",
      504,
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new DictionaryError("Word not found.", 404);
    }
    throw new DictionaryError("Dictionary service is unavailable.", 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DictionaryError("Unexpected dictionary response.", 502);
  }

  const record =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as RawDictionary)
      : null;
  if (
    !record ||
    typeof record.word !== "string" ||
    !Array.isArray(record.entries)
  ) {
    throw new DictionaryError("Unexpected dictionary response.", 502);
  }

  // The provider answers 200 with an empty `entries` array for unknown words.
  if (record.entries.length === 0) {
    throw new DictionaryError("Word not found.", 404);
  }

  return record;
}
