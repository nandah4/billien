"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rememberedWordsQueryOptions, streakQueryOptions } from "@/lib/api";
import { flattenTranslations, type LibraryWord } from "@/lib/library";

/**
 * Loads the signed-in user's words and shapes them into the row model the
 * Remembered list renders. Discovery has no seeded list: it only shows the
 * word the user searched for, which the container builds from the dictionary
 * query.
 */
export function useWordLibrary(signedIn: boolean, language: string) {
  const rememberedWordsQuery = useQuery(
    rememberedWordsQueryOptions(signedIn, language),
  );
  const streakQuery = useQuery(streakQueryOptions(signedIn));

  const savedWords = useMemo(
    () => rememberedWordsQuery.data ?? [],
    [rememberedWordsQuery.data],
  );
  const savedByKey = useMemo(
    () => new Map(savedWords.map((word) => [word.normalized_word, word])),
    [savedWords],
  );

  const rememberedItems = useMemo<LibraryWord[]>(
    () =>
      savedWords.map((word) => ({
        key: word.normalized_word,
        word: word.word,
        phonetic: word.phonetic,
        entries: word.entries ?? [],
        translation: flattenTranslations(word.translations, language),
        savedWord: word,
      })),
    [savedWords, language],
  );

  return {
    savedWords,
    savedByKey,
    streak: streakQuery.data ?? 0,
    rememberedItems,
    isLoading: rememberedWordsQuery.isLoading,
    isError: rememberedWordsQuery.isError,
    error: rememberedWordsQuery.error,
    refetch: rememberedWordsQuery.refetch,
  };
}
