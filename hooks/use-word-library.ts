"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rememberedWordsQueryOptions } from "@/lib/api";
import { flattenTranslations, type LibraryWord } from "@/lib/library";

/**
 * Loads the signed-in user's saved words and shapes them into the row model the
 * Remembered list renders. Discovery does not need this list for its result,
 * but it does use `savedByKey` to mark a searched word as already memorised.
 */
export function useWordLibrary(signedIn: boolean, language: string) {
  const rememberedWordsQuery = useQuery(
    rememberedWordsQueryOptions(signedIn, language),
  );

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
    rememberedItems,
    isLoading: rememberedWordsQuery.isLoading,
    isError: rememberedWordsQuery.isError,
    error: rememberedWordsQuery.error,
    refetch: rememberedWordsQuery.refetch,
  };
}
