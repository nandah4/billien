import type { DictionaryEntry } from "@/lib/types";

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const TIMEOUT_MS = 8_000;

export async function lookupWord(rawWord: string): Promise<DictionaryEntry[]> {
  const word = rawWord.trim().toLowerCase();
  if (!word || !/^[a-z][a-z'-]*$/i.test(word)) {
    throw new Error("Please enter a valid English word.");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(word)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error("Dictionary request timed out. Please try again.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error("Word not found.");
    throw new Error("Dictionary service is unavailable.");
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object" ||
    typeof (data[0] as { word?: unknown }).word !== "string" ||
    !Array.isArray((data[0] as { meanings?: unknown }).meanings)) {
    throw new Error("Unexpected dictionary response.");
  }

  return data as DictionaryEntry[];
}

export function normalizeForInsert(entries: DictionaryEntry[]) {
  const first = entries[0];
  const fallbackPhonetic = first.phonetics?.find(
    (item) => typeof item?.text === "string" && item.text.length > 0,
  );

  return {
    word: first.word,
    normalized_word: first.word.toLocaleLowerCase("en"),
    phonetic: first.phonetic ?? fallbackPhonetic?.text ?? null,
    phonetics: Array.isArray(first.phonetics) ? first.phonetics : [],
    meanings: Array.isArray(first.meanings) ? first.meanings : [],
    license: first.license && typeof first.license === "object" ? first.license : null,
    source_urls: Array.isArray(first.sourceUrls)
      ? first.sourceUrls.filter((value): value is string => typeof value === "string")
      : [],
    api_entries: entries,
  };
}
