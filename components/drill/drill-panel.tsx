"use client";

import { Brain, X } from "lucide-react";
import { primaryDefinition } from "@/lib/library";
import { primaryButton } from "@/lib/ui";
import type { SavedWord } from "@/lib/types";

export function DrillPanel({
  current,
  index,
  total,
  flipped,
  complete,
  loading,
  onFlip,
  onAnswer,
  onClose,
}: {
  current: SavedWord | null;
  index: number;
  total: number;
  flipped: boolean;
  complete: boolean;
  loading: boolean;
  onFlip: () => void;
  onAnswer: (result: "remembered" | "forgotten") => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Brain size={16} className="text-accent" aria-hidden="true" />
          Memory Drill
        </span>
        <button
          className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          onClick={onClose}
          aria-label="Close the drill"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {complete ? (
        <div className="mt-4 rounded-xl border border-line bg-subtle p-4 text-[13px] text-muted">
          <strong className="block text-ink">Drill complete.</strong>
          You can start another round whenever you are ready.
        </div>
      ) : current ? (
        <>
          <p className="mt-4 text-[11px] font-semibold tracking-wider text-faint uppercase">
            Word {index + 1} / {total}
          </p>
          <h3 className="mt-2 text-[30px] leading-tight font-bold tracking-[-0.02em] wrap-anywhere">
            {current.word}
          </h3>
          {flipped ? (
            <>
              <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-ink-soft italic">
                {primaryDefinition(current) ??
                  "No primary definition was saved."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-hard px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  disabled={loading}
                  onClick={() => onAnswer("forgotten")}
                >
                  Forgot
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-easy px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  disabled={loading}
                  onClick={() => onAnswer("remembered")}
                >
                  Remembered
                </button>
              </div>
            </>
          ) : (
            <button
              className={`${primaryButton} mt-4 w-full`}
              type="button"
              onClick={onFlip}
            >
              Show meaning
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
