"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppShell } from "@/components/app/app-shell-context";
import { RecallPeek } from "@/components/recall/recall-peek";
import { RecallRail } from "@/components/recall/recall-rail";
import { RecallReview } from "@/components/recall/recall-review";
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
import { RecallStart } from "@/components/recall/recall-start";
import {
  messageFor,
  recallSessionQueryOptions,
  request,
  type ApiEnvelope,
} from "@/lib/api";
import {
  applyAnswer,
  clearDraft,
  readDraft,
  writeDraft,
  type RecallDraft,
} from "@/lib/recall/draft";
import type {
  RecallCard,
  RecallScope,
  RecallSessionResult,
} from "@/lib/recall/types";
import { outlineButton } from "@/lib/ui";

type RepairOutcome = { checked: number; repaired: number; remaining: number };

const SPLIT_STYLE = {
  "--detail-track": "minmax(0, 1fr)",
  "--detail-gap": "1rem",
} as CSSProperties;

/**
 * `/recall` — choose a size, answer the cards, then review everything at once.
 *
 * The session lives in `sessionStorage` while it is being played, so a reload
 * resumes on the same card. Answers are only sent when the last card is
 * answered; until then nothing is graded and nothing reveals a result.
 */
export function RecallView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signedIn, isSessionPending, openAuth } = useAppShell();

  const [scope, setScope] = useState<RecallScope>("due");
  const [size, setSize] = useState<number | null>(null);
  const [draft, setDraft] = useState<RecallDraft | null>(() => readDraft());
  const [result, setResult] = useState<RecallSessionResult | null>(null);
  const [lastCards, setLastCards] = useState<RecallCard[]>([]);
  const [peekIndex, setPeekIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  // The draft state is for rendering; this ref is the source of truth for
  // writes. Two events can fire before React re-renders, and reading the state
  // in both would drop the first change.
  const draftRef = useRef<RecallDraft | null>(draft);
  const submittingRef = useRef(false);

  const session = useQuery(
    recallSessionQueryOptions(signedIn, scope, size ?? undefined),
  );

  const data = session.data;
  const card = draft ? (draft.cards[draft.index] ?? null) : null;

  function invalidateAfterWrite() {
    void queryClient.invalidateQueries({ queryKey: ["recall-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["streak"] });
    void queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
  }

  function begin(cards: RecallCard[], nextScope: RecallScope) {
    const next: Omit<RecallDraft, "version" | "savedAt"> = {
      clientSessionId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      scope: nextScope,
      limit: cards.length,
      index: 0,
      answers: {},
      cards,
    };
    writeDraft(next);
    const created: RecallDraft = {
      ...next,
      version: 1,
      savedAt: new Date().toISOString(),
    };
    draftRef.current = created;
    setDraft(created);
    setResult(null);
    setPeekIndex(null);
    setSubmitError(null);
  }

  function start() {
    if (!data || data.cards.length === 0) return;
    begin(data.cards, scope);
  }

  /** Writes the draft and keeps the ref in step with it. */
  function commitDraft(next: RecallDraft) {
    draftRef.current = next;
    writeDraft(next);
    setDraft(next);
  }

  /**
   * Records the answer and moves on in one update. Splitting the two used to
   * lose every answer: the advance was built from the same render snapshot and
   * wrote the previous `answers` map back.
   */
  function answerAndAdvance(answer: SessionAnswer) {
    const current = draftRef.current;
    if (!current) return;

    const next = applyAnswer(current, answer);
    commitDraft(next.draft);
    if (next.isLast) void submit(next.draft);
  }

  async function submit(current: RecallDraft) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const items = current.cards.map((entry, position) => {
      const answer = current.answers[entry.id];
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
            clientSessionId: current.clientSessionId,
            scope: current.scope,
            mode: "auto",
            startedAt: current.startedAt,
            durationMs: Date.now() - Date.parse(current.startedAt),
            items,
          }),
        },
      );
      setLastCards(current.cards);
      setResult(response.data);
      clearDraft();
      draftRef.current = null;
      setDraft(null);
      setPeekIndex(null);
      invalidateAfterWrite();
    } catch (error) {
      setSubmitError(
        messageFor(error, "Unable to submit this session. Try again."),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function override(itemId: string) {
    if (!result || overridingId) return;
    setOverridingId(itemId);

    try {
      await request(`/api/recall/sessions/${result.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overridden: true }),
      });

      const items = result.items.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              outcome: "correct" as const,
              overridden: true,
              canOverride: false,
            }
          : item,
      );
      const counts = {
        correct: result.counts.correct + 1,
        almost: result.counts.almost,
        wrong: Math.max(0, result.counts.wrong - 1),
      };
      const cardCount = items.length;
      setResult({
        ...result,
        items,
        counts,
        accuracy:
          cardCount > 0
            ? (counts.correct + counts.almost) / cardCount
            : result.accuracy,
      });
    } catch (error) {
      setSubmitError(messageFor(error, "Unable to update this answer."));
    } finally {
      setOverridingId(null);
    }
  }

  function repeatMissed() {
    if (!result) return;
    const missed = new Set(
      result.items
        .filter((item) => item.outcome === "wrong")
        .map((item) => item.userWordId),
    );
    const cards = lastCards.filter((entry) => missed.has(entry.id));
    if (cards.length === 0) return;
    begin(cards, "weak");
  }

  function discard() {
    clearDraft();
    draftRef.current = null;
    setDraft(null);
    setPeekIndex(null);
    setResult(null);
    setSubmitError(null);
    void session.refetch();
  }

  function leave() {
    invalidateAfterWrite();
    router.push("/remembered");
  }

  async function repair() {
    if (repairing) return;
    setRepairing(true);
    setRepairMessage(null);

    try {
      const response = await request<ApiEnvelope<RepairOutcome>>(
        "/api/recall/repair",
        { method: "POST" },
      );
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

  if (isSessionPending) return <RecallSkeleton />;
  if (!signedIn) return <RecallGuestState onSignIn={openAuth} />;

  // A draft and a finished result are both self-contained: they carry their own
  // cards, so neither waits for the session query.
  if (draft) {
    return (
      <div className="detail-split lg:min-h-0 lg:flex-1" style={SPLIT_STYLE}>
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          {peekIndex !== null && draft.cards[peekIndex] ? (
            <RecallPeek
              card={draft.cards[peekIndex]}
              position={peekIndex}
              total={draft.cards.length}
              answer={
                draft.answers[draft.cards[peekIndex].id]?.response ?? null
              }
              item={null}
              onBack={() => setPeekIndex(null)}
            />
          ) : card ? (
            <RecallSession
              key={`${draft.clientSessionId}:${card.id}`}
              card={card}
              index={draft.index}
              total={draft.cards.length}
              initialAnswer={draft.answers[card.id]?.response}
              onNext={answerAndAdvance}
              onExit={leave}
              onDiscard={discard}
            />
          ) : (
            <RecallCaughtUpState
              canPractiseAll={false}
              onPractiseAll={() => void session.refetch()}
            />
          )}

          {submitting ? (
            <p
              className="mt-3 text-center text-[12px] text-muted"
              role="status"
            >
              Checking your answers…
            </p>
          ) : null}

          {submitError ? (
            <div
              className="mt-3 rounded-lg border border-hard-soft bg-hard-soft/40 p-3"
              role="alert"
            >
              <p className="text-[12px] leading-relaxed text-hard">
                {submitError}
              </p>
              <button
                className={`${outlineButton} mt-2`}
                type="button"
                onClick={() => void submit(draft)}
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>

        <RecallRail
          cards={draft.cards}
          index={draft.index}
          result={null}
          activeIndex={peekIndex}
          onSelect={(nextIndex) => {
            // The current card is already on screen; only answered ones peek.
            if (nextIndex !== draft.index) setPeekIndex(nextIndex);
          }}
        />
      </div>
    );
  }

  if (result) {
    return (
      <div className="detail-split lg:min-h-0 lg:flex-1" style={SPLIT_STYLE}>
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          {peekIndex !== null && lastCards[peekIndex] ? (
            <RecallPeek
              card={lastCards[peekIndex]}
              position={peekIndex}
              total={lastCards.length}
              answer={
                result.items.find(
                  (item) => item.userWordId === lastCards[peekIndex].id,
                )?.response ?? null
              }
              item={
                result.items.find(
                  (item) => item.userWordId === lastCards[peekIndex].id,
                ) ?? null
              }
              onBack={() => setPeekIndex(null)}
            />
          ) : (
            <>
              <RecallReview
                result={result}
                onOverride={(itemId) => void override(itemId)}
                overridingId={overridingId}
                onRepeatWrong={repeatMissed}
                onDone={leave}
              />
              {submitError ? (
                <p
                  className="mt-3 rounded-lg border border-hard-soft bg-hard-soft/40 p-3 text-[12px] leading-relaxed text-hard"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <RecallRail
          cards={lastCards}
          index={lastCards.length}
          result={result}
          activeIndex={peekIndex}
          onSelect={setPeekIndex}
        />
      </div>
    );
  }

  if (session.isLoading) return <RecallSkeleton />;

  if (session.isError) {
    return (
      <RecallErrorState
        message={messageFor(session.error, "Unable to start a recall session.")}
        onRetry={() => void session.refetch()}
      />
    );
  }

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

  if (data.cards.length === 0) {
    return (
      <RecallCaughtUpState
        canPractiseAll={scope === "due"}
        onPractiseAll={() => setScope("all")}
      />
    );
  }

  // Until the user picks a size the server's default applies, clamped to the
  // largest size the library can actually fill.
  const effectiveSize =
    size !== null && data.sizeOptions.includes(size)
      ? size
      : Math.min(
          data.defaultSessionSize,
          data.sizeOptions.at(-1) ?? data.defaultSessionSize,
        );

  return (
    <RecallStart
      data={data}
      scope={scope}
      onScopeChange={(nextScope) => {
        setScope(nextScope);
        setRepairMessage(null);
      }}
      size={effectiveSize}
      onSizeChange={setSize}
      onStart={start}
      onFixWords={() => void repair()}
      repairing={repairing}
      repairMessage={repairMessage}
    />
  );
}
