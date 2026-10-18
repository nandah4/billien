"use client";

import { RotateCcw } from "lucide-react";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type { RecallSessionResult } from "@/lib/recall/types";

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
 * End of a session: the numbers, every correct answer, and the two ways out.
 * `almost` counts as correct here, matching the server's accuracy figure.
 */
export function RecallSummary({
  result,
  onRepeatWrong,
  onDone,
}: {
  result: RecallSessionResult;
  onRepeatWrong: () => void;
  onDone: () => void;
}) {
  const total = result.items.length;
  const correct = result.counts.correct + result.counts.almost;
  const wrong = result.counts.wrong;
  const accuracy = Math.round(result.accuracy * 100);
  const averageSeconds =
    total > 0
      ? Math.max(
          1,
          Math.round(
            result.items.reduce(
              (sum, item) => sum + (item.durationMs ?? 0),
              0,
            ) /
              total /
              1000,
          ),
        )
      : 0;

  const missed = result.items.filter((item) => item.outcome === "wrong");

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
        <Stat label="Correct" value={String(correct)} />
        <Stat label="Incorrect" value={String(wrong)} />
        <Stat label="Average" value={`${averageSeconds}s`} />
      </dl>

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Answers
        </h3>
        <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-surface">
          {result.items.map((item) => (
            <li
              key={item.itemId}
              className="flex items-start justify-between gap-3 px-3 py-2"
            >
              <span className="text-[13px] font-semibold text-ink">
                {item.expected}
              </span>
              <span className="max-w-[55%] text-right text-[12px] leading-relaxed text-muted">
                {item.response ? item.response : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {missed.length > 0 ? (
          <button
            className={primaryButton}
            type="button"
            onClick={onRepeatWrong}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Repeat missed
          </button>
        ) : null}
        <button className={outlineButton} type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
