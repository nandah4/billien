"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppShell } from "@/components/app/app-shell-context";
import {
  RecallCaughtUpState,
  RecallErrorState,
  RecallGateState,
  RecallGuestState,
  RecallSkeleton,
} from "@/components/recall/recall-state";
import {
  RecallSession,
  type SessionAttempt,
} from "@/components/recall/recall-session";
import { RecallSummary } from "@/components/recall/recall-summary";
import { messageFor, recallSessionQueryOptions } from "@/lib/api";
import type { RecallCard, RecallScope } from "@/lib/recall/types";

/**
 * `/recall` — a ten-card session drawn from the saved words. The queue is
 * fetched once and played to the end; `gcTime: 0` means coming back to the tab
 * starts a fresh one.
 */
export function RecallView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signedIn, isSessionPending, openAuth } = useAppShell();

  const [scope, setScope] = useState<RecallScope>("due");
  // Set only when replaying missed cards; otherwise the fetched session is used.
  const [queue, setQueue] = useState<RecallCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
  const [finished, setFinished] = useState(false);
  // Bumped on every new run so replaying a single missed card remounts the
  // session instead of reusing the previous card's feedback state.
  const [runId, setRunId] = useState(0);

  const session = useQuery(recallSessionQueryOptions(signedIn, scope));

  const cards = queue ?? session.data?.cards ?? [];
  const card = cards[index] ?? null;

  function begin(nextCards: RecallCard[]) {
    setQueue(nextCards);
    setIndex(0);
    setAttempts([]);
    setFinished(false);
    setRunId((previous) => previous + 1);
  }

  /** Idempotent by attempt id, so an override replaces rather than appends. */
  function record(attempt: SessionAttempt) {
    setAttempts((previous) => {
      const at = previous.findIndex(
        (item) => item.result.attemptId === attempt.result.attemptId,
      );
      if (at === -1) return [...previous, attempt];
      const next = [...previous];
      next[at] = attempt;
      return next;
    });
  }

  function next() {
    if (index + 1 >= cards.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
  }

  function leave() {
    void queryClient.invalidateQueries({ queryKey: ["recall-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
    void queryClient.invalidateQueries({ queryKey: ["streak"] });
    router.push("/remembered");
  }

  function repeatMissed() {
    const missed = new Set(
      attempts
        .filter(
          (item) =>
            item.result.outcome === "wrong" ||
            item.result.outcome === "revealed",
        )
        .map((item) => item.card.id),
    );
    const subset = cards.filter((item) => missed.has(item.id));
    if (subset.length > 0) begin(subset);
  }

  if (isSessionPending) return <RecallSkeleton />;

  if (!signedIn) return <RecallGuestState onSignIn={openAuth} />;

  if (session.isLoading) return <RecallSkeleton />;

  if (session.isError) {
    return (
      <RecallErrorState
        message={messageFor(session.error, "Unable to start a recall session.")}
        onRetry={() => void session.refetch()}
      />
    );
  }

  const data = session.data;
  if (!data) return <RecallSkeleton />;

  if (data.librarySize < data.minLibrarySize) {
    return (
      <RecallGateState
        librarySize={data.librarySize}
        minLibrarySize={data.minLibrarySize}
        onGoToDiscovery={() => router.push("/")}
      />
    );
  }

  if (finished) {
    return (
      <RecallSummary
        attempts={attempts}
        onRepeatWrong={repeatMissed}
        onDone={leave}
      />
    );
  }

  if (!card) {
    return (
      <RecallCaughtUpState
        canPractiseAll={scope === "due"}
        onPractiseAll={() => setScope("all")}
      />
    );
  }

  return (
    <RecallSession
      key={`${runId}:${card.id}`}
      card={card}
      index={index}
      total={cards.length}
      onAttempt={record}
      onNext={next}
      onExit={leave}
    />
  );
}
