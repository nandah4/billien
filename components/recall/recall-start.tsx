"use client";

import { Brain, Wrench } from "lucide-react";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import type { RecallScope, RecallSession } from "@/lib/recall/types";

const SCOPES: { id: RecallScope; label: string }[] = [
  { id: "due", label: "Due now" },
  { id: "all", label: "All words" },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-subtle px-3 py-2">
      <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[16px] leading-tight font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

/**
 * Pre-session panel: how many cards, which words, and what the library can
 * actually support. The size list comes from the server, so the UI never offers
 * a number the library cannot fill.
 */
export function RecallStart({
  data,
  scope,
  onScopeChange,
  size,
  onSizeChange,
  onStart,
  onFixWords,
  repairing,
  repairMessage,
}: {
  data: RecallSession;
  scope: RecallScope;
  onScopeChange: (scope: RecallScope) => void;
  size: number;
  onSizeChange: (size: number) => void;
  onStart: () => void;
  onFixWords: () => void;
  repairing: boolean;
  repairMessage: string | null;
}) {
  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-5 sm:p-6`}>
      <p className="text-[11px] font-semibold tracking-wider text-faint uppercase">
        Recall
      </p>
      <h2 className="mt-1 text-[20px] leading-tight font-semibold text-ink">
        Start a session
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Type the English word for each prompt. Answers are checked together when
        you finish.
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Eligible" value={data.eligibleCount} />
        <Stat label="Due" value={data.totalDue} />
        <Stat label="Saved" value={data.librarySize} />
      </dl>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Words
        </legend>
        <div className="mt-1.5 inline-flex rounded-lg border border-line bg-subtle p-1">
          {SCOPES.map((item) => {
            const active = scope === item.id;
            return (
              <button
                key={item.id}
                className={`inline-flex h-8 items-center rounded-md px-3 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
                type="button"
                aria-pressed={active}
                onClick={() => onScopeChange(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <label
          className="text-[11px] font-semibold tracking-wider text-muted uppercase"
          htmlFor="recall-size"
        >
          Cards
        </label>
        <select
          id="recall-size"
          className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink transition focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
        >
          {data.sizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} cards
            </option>
          ))}
        </select>
      </div>

      {data.ineligibleCount > 0 ? (
        <div className="mt-4 rounded-lg border border-line bg-subtle p-3">
          <p className="text-[12px] leading-relaxed text-muted">
            {data.ineligibleCount}{" "}
            {data.ineligibleCount === 1 ? "saved word has" : "saved words have"}{" "}
            no translation, definition, or example, so they cannot become cards.
          </p>
          <button
            className={`${outlineButton} mt-2`}
            type="button"
            disabled={repairing}
            onClick={onFixWords}
          >
            <Wrench size={14} aria-hidden="true" />
            {repairing ? "Fixing…" : `Fix ${data.ineligibleCount} words`}
          </button>
          {repairMessage ? (
            <p className="mt-2 text-[12px] text-muted" role="status">
              {repairMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <button className={`${primaryButton} mt-5`} type="button" onClick={onStart}>
        <Brain size={15} aria-hidden="true" />
        Start session
      </button>
    </div>
  );
}
