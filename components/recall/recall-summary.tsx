"use client";

import { RotateCcw } from "lucide-react";
import type { SessionAttempt } from "@/components/recall/recall-session";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type { RecallCard } from "@/lib/recall/types";

function promptLabel(prompt: RecallCard["prompt"]): string {
  if (prompt.kind === "translation") return prompt.words.join(", ");
  if (prompt.kind === "definition") return prompt.definition;
  if (prompt.kind === "cloze") return prompt.sentence;
  return prompt.word;
}

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
 * End of a session: the numbers, the words that were missed, and the two ways
 * out. `almost` counts as correct here, matching the server's accuracy figure.
 */
export function RecallSummary({
  attempts,
  onRepeatWrong,
  onDone,
}: {
  attempts: SessionAttempt[];
  onRepeatWrong: () => void;
  onDone: () => void;
}) {
  const total = attempts.length;
  const correct = attempts.filter(
    (item) =>
      item.result.outcome === "correct" || item.result.outcome === "almost",
  ).length;
  const wrong = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const averageSeconds =
    total > 0
      ? Math.max(
          1,
          Math.round(
            attempts.reduce((sum, item) => sum + item.durationMs, 0) /
              total /
              1000,
          ),
        )
      : 0;

  const missed = attempts.filter(
    (item) =>
      item.result.outcome === "wrong" || item.result.outcome === "revealed",
  );

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

      {missed.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Worth another look
          </h3>
          <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-surface">
            {missed.map((item) => (
              <li
                key={item.card.id}
                className="flex items-start justify-between gap-3 px-3 py-2"
              >
                <span className="text-[13px] font-semibold text-ink">
                  {item.result.expected}
                </span>
                <span className="max-w-[60%] text-right text-[12px] leading-relaxed text-muted">
                  {promptLabel(item.card.prompt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {missed.length > 0 ? (
          <button className={primaryButton} type="button" onClick={onRepeatWrong}>
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
