"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import { DRILL_SIZE } from "@/lib/library";
import type { SavedWord } from "@/lib/types";

/**
 * Flashcard drill state machine. Owns the queue, the current card, and the
 * reveal state; reports user-facing failures through `onNotice` so the caller
 * keeps a single notice surface.
 */
export function useDrill({
  signedIn,
  onRequireAuth,
  onNotice,
}: {
  signedIn: boolean;
  onRequireAuth: () => void;
  onNotice: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState(false);
  const [queue, setQueue] = useState<SavedWord[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const current = queue[index] ?? null;

  function close() {
    setActive(false);
    setQueue([]);
    setIndex(0);
    setFlipped(false);
    setComplete(false);
  }

  /** `ids` scopes the drill to the active Remembered filter result. */
  async function start(ids?: string[]) {
    if (!signedIn) {
      onRequireAuth();
      return;
    }
    setLoading(true);
    onNotice(null);
    try {
      const scoped = ids?.filter(Boolean) ?? [];
      const url =
        scoped.length > 0
          ? `/api/review?ids=${encodeURIComponent(scoped.join(","))}`
          : `/api/review?count=${DRILL_SIZE}`;
      const response = await request<ApiEnvelope<SavedWord[]>>(url);
      if (response.data.length === 0) {
        onNotice("Add some words before starting a drill.");
        return;
      }
      setQueue(response.data);
      setIndex(0);
      setFlipped(false);
      setComplete(false);
      setActive(true);
    } catch (error) {
      onNotice(messageFor(error, "Unable to start the drill."));
    } finally {
      setLoading(false);
    }
  }

  async function answer(result: "remembered" | "forgotten") {
    if (!current) return;
    setLoading(true);
    onNotice(null);
    try {
      await request<ApiEnvelope<SavedWord>>(`/api/words/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      if (index + 1 >= queue.length) {
        setComplete(true);
        setIndex((value) => value + 1);
      } else {
        setIndex((value) => value + 1);
        setFlipped(false);
      }
    } catch (error) {
      onNotice(messageFor(error, "Unable to record the review."));
    } finally {
      setLoading(false);
    }
  }

  return {
    active,
    current,
    index,
    total: queue.length,
    flipped,
    complete,
    loading,
    start,
    answer,
    close,
    flip: () => setFlipped(true),
  };
}
