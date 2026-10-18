"use client";

import { Check, Lock } from "lucide-react";
import { cardClass } from "@/lib/ui";
import type { RecallCard, RecallSessionResult } from "@/lib/recall/types";

type RailStatus = "answered" | "current" | "locked";

function statusFor(
  index: number,
  current: number,
  result: RecallSessionResult | null,
  card: RecallCard,
): RailStatus {
  if (result) {
    const item = result.items.find((entry) => entry.userWordId === card.id);
    return item ? "answered" : "locked";
  }
  if (index < current) return "answered";
  if (index === current) return "current";
  return "locked";
}

function itemFor(result: RecallSessionResult | null, card: RecallCard) {
  if (!result) return null;
  return result.items.find((entry) => entry.userWordId === card.id) ?? null;
}

/**
 * The second column: one numbered row per card.
 *
 * During a session it only reveals progress — answered, current, locked — and
 * never whether an answer was right. Rows behind the current card can be
 * reopened to re-read the prompt and the answer that was given; rows ahead stay
 * locked, so the only way forward is the card's own button.
 */
export function RecallRail({
  cards,
  index,
  result,
  activeIndex,
  onSelect,
}: {
  cards: RecallCard[];
  index: number;
  result: RecallSessionResult | null;
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <aside className="order-first min-w-0 lg:order-none">
      <div className={`${cardClass} p-3`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-faint uppercase">
            Recall
          </span>
          <span className="text-[11px] text-muted">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </span>
        </div>

        <ol className="mt-2 flex gap-1.5 overflow-x-auto pb-1 lg:max-h-[28rem] lg:flex-col lg:overflow-y-auto lg:pb-0">
          {cards.map((card, position) => {
            const status = statusFor(position, index, result, card);
            const item = itemFor(result, card);
            const active = activeIndex === position;
            const locked = status === "locked";

            return (
              <li key={card.id} className="shrink-0 lg:shrink">
                <button
                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    active
                      ? "border-accent-line bg-accent-soft text-accent"
                      : status === "current"
                        ? "border-line bg-subtle text-ink"
                        : locked
                          ? "border-line bg-surface text-faint"
                          : "border-line bg-surface text-ink-soft hover:bg-hover"
                  }`}
                  type="button"
                  disabled={locked}
                  aria-current={status === "current" ? "step" : undefined}
                  aria-label={`Card ${position + 1} of ${cards.length}${
                    locked ? ", locked" : status === "current" ? ", current" : ""
                  }`}
                  onClick={() => onSelect(position)}
                >
                  <span
                    className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      item?.outcome === "wrong"
                        ? "bg-hard-soft text-hard"
                        : item
                          ? "bg-easy-soft text-easy"
                          : "bg-subtle text-faint"
                    }`}
                  >
                    {item && item.outcome !== "wrong" ? (
                      <Check size={11} aria-hidden="true" />
                    ) : (
                      position + 1
                    )}
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate lg:inline">
                    {locked
                      ? "Locked"
                      : status === "current"
                        ? "Current"
                        : "Answered"}
                  </span>
                  {locked ? (
                    <Lock size={12} className="shrink-0" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
