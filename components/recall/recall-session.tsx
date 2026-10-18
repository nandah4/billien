"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lightbulb, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { RecallPromptView } from "@/components/recall/recall-prompt";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type { RecallCard, RecallSessionAnswer } from "@/lib/recall/types";

export type SessionAnswer = RecallSessionAnswer;

/**
 * One card: prompt, answer field, and a Next button. Nothing is graded here —
 * the whole session is submitted once the last card is answered, so no outcome
 * appears before the review screen.
 */
export function RecallSession({
  card,
  index,
  total,
  initialAnswer,
  onNext,
  onExit,
  onDiscard,
}: {
  card: RecallCard;
  index: number;
  total: number;
  initialAnswer?: string;
  /** Records this answer and moves on; the view owns the draft. */
  onNext: (answer: SessionAnswer) => void;
  onExit: () => void;
  onDiscard: () => void;
}) {
  const [answer, setAnswer] = useState(initialAnswer ?? "");
  const [hintVisible, setHintVisible] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isLast = index + 1 >= total;

  // Escape asks before leaving; the answer is not lost because the view keeps a
  // draft.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (exitOpen) return;
      setExitOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exitOpen]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext({
      userWordId: card.id,
      position: index,
      mode: card.mode,
      response: answer,
      durationMs: Date.now() - startedAt,
      usedHint: hintVisible,
    });
  }

  return (
    <>
      <form className={`${cardClass} w-full p-5 sm:p-6`} onSubmit={submit}>
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
          <RecallPromptView prompt={card.prompt} onChoose={setAnswer} />
        </div>

        {card.prompt.kind === "choice" ? null : (
          <>
            <label className="sr-only" htmlFor="recall-answer">
              Type the English word
            </label>
            <input
              id="recall-answer"
              ref={inputRef}
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
                  onClick={() => {
                    setHintVisible(true);
                    inputRef.current?.focus();
                  }}
                >
                  <Lightbulb size={13} aria-hidden="true" />
                  Hint
                </button>
              )}
            </div>
          </>
        )}

        <button className={`${primaryButton} mt-4`} type="submit">
          {isLast ? "Finish" : "Next"}
        </button>
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
          Your answers so far are kept as a draft, so you can pick this session
          up again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
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
        <button
          className="mt-3 w-full rounded-md py-1 text-[11px] font-semibold text-hard transition hover:bg-hard-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          onClick={onDiscard}
        >
          Discard this session
        </button>
      </Modal>
    </>
  );
}
