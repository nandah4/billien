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
  type SessionAnswer,
} from "@/components/recall/recall-session";
import { RecallSummary } from "@/components/recall/recall-summary";
import {
  messageFor,
  recallSessionQueryOptions,
  request,
  type ApiEnvelope,
} from "@/lib/api";
import { outlineButton } from "@/lib/ui";
import type { RecallCard, RecallSessionResult } from "@/lib/recall/types";

/**
 * `/recall` — a session drawn from the saved words. Answers are collected on
 * the client and submitted once, so nothing is graded until the review screen.
 */
export function RecallView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signedIn, isSessionPending, openAuth } = useAppShell();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SessionAnswer>>({});
  const [clientSessionId] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => new Date().toISOString());
  const [result, setResult] = useState<RecallSessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  const session = useQuery(recallSessionQueryOptions(signedIn, "due"));

  const cards: RecallCard[] = session.data?.cards ?? [];
  const card = cards[index] ?? null;

  function record(answer: SessionAnswer) {
    setAnswers((previous) => ({ ...previous, [answer.userWordId]: answer }));
  }

  async function submit(nextCards: RecallCard[]) {
    if (submitting || nextCards.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const items = nextCards.map((entry, position) => {
      const answer = answers[entry.id];
      return {
        userWordId: entry.id,
        position,
        mode: answer?.mode ?? entry.mode,
        response: answer?.response ?? "",
        durationMs: answer?.durationMs ?? 0,
        usedHint: answer?.usedHint ?? false,
      };
    });

    try {
      const response = await request<ApiEnvelope<RecallSessionResult>>(
        "/api/recall/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientSessionId,
            scope: "due",
            mode: "auto",
            startedAt,
            durationMs: Date.now() - Date.parse(startedAt),
            items,
          }),
        },
      );
      setResult(response.data);
      void queryClient.invalidateQueries({ queryKey: ["recall-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["streak"] });
      void queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
    } catch (error) {
      setSubmitError(
        messageFor(error, "Unable to submit this session. Try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (index + 1 >= cards.length) {
      void submit(cards);
      return;
    }
    setIndex(index + 1);
  }

  function restart() {
    setIndex(0);
    setAnswers({});
    setResult(null);
    setSubmitError(null);
    void session.refetch();
  }

  async function repair() {
    if (repairing) return;
    setRepairing(true);
    setRepairMessage(null);
    try {
      const response = await request<
        ApiEnvelope<{ checked: number; repaired: number; remaining: number }>
      >("/api/recall/repair", { method: "POST" });
      const { repaired: fixed, remaining } = response.data;
      setRepairMessage(
        fixed > 0
          ? `${fixed} ${fixed === 1 ? "word" : "words"} fixed${
              remaining > 0 ? `, ${remaining} still need attention.` : "."
            }`
          : "Nothing could be filled automatically. Try another word.",
      );
      await session.refetch();
    } catch (error) {
      setRepairMessage(messageFor(error, "Unable to repair your words."));
    } finally {
      setRepairing(false);
    }
  }

  function leave() {
    void queryClient.invalidateQueries({ queryKey: ["recall-stats"] });
    router.push("/remembered");
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

  if (data.eligibleCount < data.minSessionSize) {
    return (
      <RecallGateState
        eligibleCount={data.eligibleCount}
        librarySize={data.librarySize}
        ineligibleCount={data.ineligibleCount}
        minSessionSize={data.minSessionSize}
        onGoToDiscovery={() => router.push("/")}
        onRepair={() => void repair()}
        repairing={repairing}
        repairMessage={repairMessage}
      />
    );
  }

  if (result) {
    return (
      <RecallSummary result={result} onRepeatWrong={restart} onDone={leave} />
    );
  }

  if (submitting) {
    return (
      <div className={`mx-auto w-full max-w-2xl`}>
        <RecallSkeleton />
        <p className="mt-3 text-center text-[12px] text-muted">
          Checking your answers…
        </p>
      </div>
    );
  }

  if (!card) {
    return (
      <RecallCaughtUpState
        canPractiseAll={false}
        onPractiseAll={() => void session.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <RecallSession
        key={card.id}
        card={card}
        index={index}
        total={cards.length}
        initialAnswer={answers[card.id]?.response}
        onAnswer={record}
        onNext={next}
        onExit={leave}
      />

      {submitError ? (
        <div
          className="mt-3 rounded-lg border border-hard-soft bg-hard-soft/40 p-3"
          role="alert"
        >
          <p className="text-[12px] leading-relaxed text-hard">{submitError}</p>
          <button
            className={`${outlineButton} mt-2`}
            type="button"
            onClick={() => void submit(cards)}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
