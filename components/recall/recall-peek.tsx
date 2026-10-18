"use client";

import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { RecallPromptView } from "@/components/recall/recall-prompt";
import { cardClass, outlineButton } from "@/lib/ui";
import type { RecallCard, RecallSessionItem } from "@/lib/recall/types";

/**
 * Read-only view of one card the user has already answered. During a session it
 * deliberately hides whether the answer was right; after the session it shows
 * the outcome and the correct word.
 */
export function RecallPeek({
  card,
  position,
  total,
  answer,
  item,
  onBack,
}: {
  card: RecallCard;
  position: number;
  total: number;
  answer: string | null;
  item: RecallSessionItem | null;
  onBack: () => void;
}) {
  return (
    <div className={`${cardClass} w-full p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-wider text-faint uppercase">
          Card {position + 1} / {total}
        </span>
        <button className={outlineButton} type="button" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </button>
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-wider text-faint uppercase">
        {card.partOfSpeech}
      </p>
      <div className="mt-1.5">
        <RecallPromptView prompt={card.prompt} disabled />
      </div>

      <dl className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-subtle px-3 py-2">
          <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
            Your answer
          </dt>
          <dd className="mt-0.5 text-[13px] text-ink">
            {answer && answer.trim().length > 0 ? answer : "—"}
          </dd>
        </div>

        {item ? (
          <div className="rounded-lg border border-line bg-subtle px-3 py-2">
            <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              Correct word
            </dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              {item.outcome === "wrong" ? (
                <XCircle size={13} className="text-hard" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  size={13}
                  className="text-easy"
                  aria-hidden="true"
                />
              )}
              {item.expected}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
