"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Lightbulb,
  X,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type {
  RecallAttemptResult,
  RecallCard,
  RecallOutcome,
} from "@/lib/recall/types";

export type SessionAttempt = {
  card: RecallCard;
  result: RecallAttemptResult;
  durationMs: number;
};

const FEEDBACK: Record<
  RecallOutcome,
  { icon: typeof CheckCircle2; title: string; box: string; tint: string }
> = {
  correct: {
    icon: CheckCircle2,
    title: "Correct",
    box: "border-easy bg-easy-soft/60",
    tint: "text-easy",
  },
  almost: {
    icon: AlertCircle,
    title: "Almost",
    box: "border-medium bg-medium-soft/60",
    tint: "text-medium",
  },
  wrong: {
    icon: XCircle,
    title: "Not quite",
    box: "border-hard bg-hard-soft/60",
    tint: "text-hard",
  },
  revealed: {
    icon: Eye,
    title: "Answer revealed",
    box: "border-line bg-subtle",
    tint: "text-muted",
  },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function detailFor(result: RecallAttemptResult): string {
  if (result.outcome === "correct") {
    return `Next review ${formatDate(result.nextDueAt)}.`;
  }
  if (result.outcome === "almost") {
    return `The spelling is “${result.expected}”. Next review ${formatDate(result.nextDueAt)}.`;
  }
  return `The word is “${result.expected}”. It comes back in ten minutes.`;
}

function Prompt({
  prompt,
  disabled,
  onChoose,
}: {
  prompt: RecallCard["prompt"];
  disabled: boolean;
  onChoose: (label: string) => void;
}) {
  if (prompt.kind === "translation") {
    return (
      <div>
        <div className="flex flex-wrap gap-1.5">
          {prompt.words.map((word) => (
            <span
              key={word}
              className="rounded-full border border-accent-line bg-surface px-2.5 py-1 text-[14px] font-medium text-ink"
            >
              {word}
            </span>
          ))}
        </div>
        {prompt.definition ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {prompt.definition}
          </p>
        ) : null}
      </div>
    );
  }

  if (prompt.kind === "definition") {
    return (
      <p className="text-[15px] leading-relaxed text-ink">{prompt.definition}</p>
    );
  }

  if (prompt.kind === "cloze") {
    return (
      <div>
        <p className="text-[15px] leading-relaxed text-ink">{prompt.sentence}</p>
        {prompt.definition ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {prompt.definition}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[22px] leading-tight font-semibold text-ink">
        {prompt.word}
      </p>
      {prompt.phonetic ? (
        <p className="mt-0.5 text-[13px] text-muted">{prompt.phonetic}</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {prompt.options.map((option) => (
          <button
            key={option.id}
            className={`${outlineButton} justify-start`}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One card: prompt, answer field, and the graded result. The component is
 * keyed by card id by its parent, so every card starts with fresh state and
 * the timer resets without an effect.
 */
export function RecallSession({
  card,
  index,
  total,
  onAttempt,
  onNext,
  onExit,
}: {
  card: RecallCard;
  index: number;
  total: number;
  onAttempt: (attempt: SessionAttempt) => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RecallAttemptResult | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const clientId = useRef<string | null>(null);

  const isLast = index + 1 >= total;

  // Escape asks before dropping the rest of the queue. Once the answer is
  // graded, Escape is left alone so it cannot discard the feedback by accident.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (exitOpen || result) return;
      setExitOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exitOpen, result]);

  async function submit(reveal: boolean, choice?: string) {
    if (pending || result) return;

    setPending(true);
    setError(null);
    if (!clientId.current) clientId.current = crypto.randomUUID();

    const elapsed = Date.now() - startedAt;

    try {
      const response = await request<ApiEnvelope<RecallAttemptResult>>(
        "/api/recall/attempts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWordId: card.id,
            mode: card.mode,
            reveal,
            response: reveal ? undefined : (choice ?? answer),
            durationMs: elapsed,
            usedHint: hintVisible,
            clientAttemptId: clientId.current,
          }),
        },
      );
      setResult(response.data);
      setDuration(elapsed);
      onAttempt({ card, result: response.data, durationMs: elapsed });
    } catch (requestError) {
      setError(
        messageFor(requestError, "Unable to check your answer. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  async function override() {
    if (!result || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await request<
        ApiEnvelope<{ recallStreak: number; lapses: number; nextDueAt: string }>
      >(`/api/recall/attempts/${result.attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overridden: true }),
      });

      const updated: RecallAttemptResult = {
        ...result,
        outcome: "correct",
        canOverride: false,
        recallStreak: response.data.recallStreak,
        nextDueAt: response.data.nextDueAt,
      };
      setResult(updated);
      onAttempt({ card, result: updated, durationMs: duration ?? 0 });
    } catch (requestError) {
      setError(
        messageFor(requestError, "Unable to update this attempt. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result) {
      onNext();
      return;
    }
    void submit(false);
  }

  const feedback = result ? FEEDBACK[result.outcome] : null;
  const FeedbackIcon = feedback?.icon;

  return (
    <>
      <form
        className={`${cardClass} mx-auto w-full max-w-2xl p-5 sm:p-6`}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-faint uppercase">
            Recall · {index + 1} / {total}
          </span>
          <button
            className="-mr-1 inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label="Leave this session"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Session progress"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <p className="mt-5 text-[11px] font-semibold tracking-wider text-faint uppercase">
          {card.partOfSpeech}
        </p>

        <div className="mt-1.5">
          <Prompt
            prompt={card.prompt}
            disabled={pending || result !== null}
            onChoose={(label) => void submit(false, label)}
          />
        </div>

        {card.prompt.kind !== "choice" ? (
          <>
            <label className="sr-only" htmlFor="recall-answer">
              Type the English word
            </label>
            <input
              id="recall-answer"
              className="mt-5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink transition placeholder:text-placeholder focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type here"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              readOnly={result !== null}
              aria-describedby="recall-hint"
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <p id="recall-hint" className="text-[11px] text-muted">
                {hintVisible
                  ? `${card.hint.length} letters, starts with “${card.hint.initial}”`
                  : `${card.hint.length} letters`}
              </p>
              {hintVisible ? null : (
                <button
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  disabled={pending || result !== null}
                  onClick={() => setHintVisible(true)}
                >
                  <Lightbulb size={13} aria-hidden="true" />
                  Hint
                </button>
              )}
            </div>
          </>
        ) : null}

        {result ? null : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButton} type="submit" disabled={pending}>
              {pending ? "Checking…" : "Check"}
            </button>
            <button
              className={outlineButton}
              type="button"
              disabled={pending}
              onClick={() => void submit(true)}
            >
              Show answer
            </button>
          </div>
        )}

        {error ? (
          <p
            className="mt-3 rounded-lg border border-hard-soft bg-hard-soft/40 p-2.5 text-[12px] leading-relaxed text-hard"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {result && feedback && FeedbackIcon ? (
          <div
            className={`mt-4 rounded-lg border p-3 ${feedback.box}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <FeedbackIcon
                size={16}
                className={`mt-0.5 shrink-0 ${feedback.tint}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className={`text-[12px] font-semibold ${feedback.tint}`}>
                  {feedback.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                  {detailFor(result)}
                </p>
                {result.canOverride ? (
                  <button
                    className="mt-2 inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-accent transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                    type="button"
                    disabled={pending}
                    onClick={() => void override()}
                  >
                    I actually knew this
                  </button>
                ) : null}
              </div>
            </div>

            <button
              className={`${primaryButton} mt-3 w-full sm:w-auto`}
              type="submit"
              disabled={pending}
            >
              {isLast ? "See summary" : "Next"}
            </button>
          </div>
        ) : null}
      </form>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        labelledBy="recall-exit-title"
        maxWidthClass="max-w-sm"
      >
        <h2
          id="recall-exit-title"
          className="text-[16px] leading-tight font-semibold text-ink"
        >
          Leave this session?
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Answers you have already checked are saved. The remaining cards will
          come back next time.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            className={`${outlineButton} flex-1`}
            type="button"
            onClick={() => setExitOpen(false)}
          >
            Keep going
          </button>
          <button
            className={`${primaryButton} flex-1`}
            type="button"
            onClick={onExit}
          >
            Leave
          </button>
        </div>
      </Modal>
    </>
  );
}
