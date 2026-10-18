"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppShell } from "@/components/app/app-shell-context";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import type { SavedWord } from "@/lib/types";

/**
 * Write-side of the word library: save, un-save, and record a review. Both
 * views share it so cache invalidation and notices behave identically.
 */
export function useWordActions() {
  const { signedIn, preferredLanguage, openAuth } = useAppShell();
  const queryClient = useQueryClient();

  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [unsavingKey, setUnsavingKey] = useState<string | null>(null);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);

  async function saveWord(name: string): Promise<SavedWord | null> {
    if (!signedIn) {
      openAuth();
      return null;
    }
    setSavingKey(name);
    setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord>>("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: name }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      setNotice(
        response.alreadySaved
          ? `"${name}" is already in your memorised list.`
          : `"${name}" was added to your memorised list.`,
      );
      return response.data;
    } catch (error) {
      setNotice(messageFor(error, "Unable to save this word."));
      return null;
    } finally {
      setSavingKey(null);
    }
  }

  /**
   * Removes the word from Remembered with an optimistic update. Returns whether
   * the request succeeded so the caller can clear its selection.
   */
  async function unsaveWord(word: SavedWord): Promise<boolean> {
    if (unsavingKey) return false;
    setUnsavingKey(word.id);
    setNotice(null);

    const cacheKey = ["remembered-words", preferredLanguage];
    const previous = queryClient.getQueryData<ApiEnvelope<SavedWord[]>>(cacheKey);
    queryClient.setQueryData<ApiEnvelope<SavedWord[]>>(cacheKey, (old) =>
      old
        ? { ...old, data: old.data.filter((item) => item.id !== word.id) }
        : old,
    );

    try {
      await request<ApiEnvelope<{ id: string }>>(`/api/words/${word.id}`, {
        method: "DELETE",
      });
      setNotice(`"${word.word}" was removed from Remembered.`);
      return true;
    } catch (error) {
      queryClient.setQueryData(cacheKey, previous);
      setNotice(messageFor(error, "Unable to remove this word."));
      return false;
    } finally {
      queryClient.removeQueries({ queryKey: ["remembered-word", word.id] });
      await queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
      setUnsavingKey(null);
    }
  }

  /**
   * Records a successful recall. This is the only manual way to grow the review
   * counters now that the drill UI is gone.
   */
  async function reviewWord(word: SavedWord): Promise<SavedWord | null> {
    if (reviewingKey) return null;
    setReviewingKey(word.id);
    setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord>>(
        `/api/words/${word.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: "remembered" }),
        },
      );
      queryClient.setQueryData<ApiEnvelope<SavedWord>>(
        ["remembered-word", word.id],
        (current) =>
          current
            ? { ...current, data: response.data }
            : { data: response.data },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      setNotice(`"${word.word}" marked as remembered.`);
      return response.data;
    } catch (error) {
      setNotice(messageFor(error, "Unable to record the review."));
      return null;
    } finally {
      setReviewingKey(null);
    }
  }

  return {
    notice,
    setNotice,
    savingKey,
    unsavingKey,
    reviewingKey,
    saveWord,
    unsaveWord,
    reviewWord,
  };
}
