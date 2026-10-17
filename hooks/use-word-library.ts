"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  dictionaryQueryOptions,
  rememberedWordsQueryOptions,
  streakQueryOptions,
} from "@/lib/api";
import { DISCOVERY_WORDS } from "@/lib/discovery";
import type { LibraryWord } from "@/lib/library";

/**
 * Loads the signed-in user's words plus the curated discovery seed, and shapes
 * both into the row model the list renders. The seed is filtered against saved
 * words so a word never appears in Discovery after being memorised.
 */
export function useWordLibrary(signedIn: boolean) {
  const rememberedWordsQuery = useQuery(rememberedWordsQueryOptions(signedIn));
  const streakQuery = useQuery(streakQueryOptions(signedIn));

  const savedWords = useMemo(
    () => rememberedWordsQuery.data ?? [],
    [rememberedWordsQuery.data],
  );
  const savedByKey = useMemo(
    () => new Map(savedWords.map((word) => [word.normalized_word, word])),
    [savedWords],
  );
  const seedWords = useMemo(
    () => DISCOVERY_WORDS.filter((word) => !savedByKey.has(word)),
    [savedByKey],
  );
  const seedQueries = useQueries({
    queries: seedWords.map((word) => dictionaryQueryOptions(word)),
  });

  const discoveryItems = useMemo<LibraryWord[]>(
    () =>
      seedWords.map((word, index) => {
        const entry = seedQueries[index]?.data ?? null;
        return {
          key: word,
          word: entry?.word ?? word,
          phonetic: entry?.phonetic ?? null,
          meanings: entry?.meanings ?? [],
          savedWord: null,
        };
      }),
    [seedWords, seedQueries],
  );

  const rememberedItems = useMemo<LibraryWord[]>(
    () =>
      savedWords.map((word) => ({
        key: word.normalized_word,
        word: word.word,
        phonetic: word.phonetic,
        meanings: word.meanings ?? [],
        savedWord: word,
      })),
    [savedWords],
  );

  return {
    savedWords,
    streak: streakQuery.data ?? 0,
    discoveryItems,
    rememberedItems,
    isLoading: rememberedWordsQuery.isLoading,
    isError: rememberedWordsQuery.isError,
    error: rememberedWordsQuery.error,
  };
}
