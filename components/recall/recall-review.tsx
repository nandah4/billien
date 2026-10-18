"use client";

import { AlertCircle, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type { RecallOutcome, RecallSessionResult } from "@/lib/recall/types";

const BADGE: Record<
  RecallOutcome,
  { icon: typeof CheckCircle2; label: string; tone: string }
> = {
  correct: {
    icon: CheckCircle2,
    label: "Correct",
    tone: "text-easy",
  },
  almost: {
    icon: AlertCircle,
    label: "Almost",
    tone: "text-medium",
  },
  wrong: {
    icon: XCircle,
    label: "Incorrect",
    tone: "text-hard",
  },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-subtle px-3 py-2.5">
      <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[18px] leading-tight font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

/**
 * Review screen. Every answer is shown with the correct word, so the session's
 * result is visible in one place. `almost` counts as correct in the headline,
 * matching the server's accuracy figure, but keeps its own badge in the list.
 */
export function RecallReview({
  result,
  onOverride,
  overridingId,
  onRepeatWrong,
  onDone,
}: {
  result: RecallSessionResult;
  onOverride: (itemId: string) => void;
  overridingId: string | null;
  onRepeatWrong: () => void;
  onDone: () => void;
}) {
  const total = result.items.length;
  const correct = result.counts.correct + result.counts.almost;
  const missed = result.items.filter(
    (item) => item.outcome === "wrong" && !item.overridden,
  );
  const accuracy = Math.round(result.accuracy * 100);
  const averageSeconds =
    total > 0
      ? Math.max(
          1,
          Math.round(
            result.items.reduce((sum, item) => sum + (item.durationMs ?? 0), 0) /
              total /
              1000,
          ),
        )
      : 0;

  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-5 sm:p-6`}>
      <p className="text-[11px] font-semibold tracking-wider text-faint uppercase">
        Session complete
      </p>
      <h2 className="mt-1 text-[20px] leading-tight font-semibold text-ink">
        {correct} of {total} correct
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Correct" value={String(result.counts.correct)} />
        <Stat label="Almost" value={String(result.counts.almost)} />
        <Stat label="Average" value={`${averageSeconds}s`} />
      </dl>

      <h3 className="mt-5 text-[11px] font-semibold tracking-wider text-muted uppercase">
        Answers
      </h3>
      <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-surface">
        {result.items.map((item) => {
          const badge = BADGE[item.outcome];
          const Icon = badge.icon;
          return (
            <li key={item.itemId} className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">
                    {item.expected}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                    You wrote{" "}
                    <span className="text-ink-soft">
                      {item.response && item.response.trim().length > 0
                        ? item.response
                        : "nothing"}
                    </span>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold ${badge.tone}`}
                >
                  <Icon size={13} aria-hidden="true" />
                  {badge.label}
                </span>
              </div>

              {item.canOverride ? (
                <button
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-accent transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  type="button"
                  disabled={overridingId !== null}
                  onClick={() => onOverride(item.itemId)}
                >
                  {overridingId === item.itemId
                    ? "Updating…"
                    : "I actually knew this"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {missed.length > 0 ? (
          <button className={primaryButton} type="button" onClick={onRepeatWrong}>
            <RotateCcw size={14} aria-hidden="true" />
            Repeat {missed.length} missed
          </button>
        ) : null}
        <button className={outlineButton} type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
