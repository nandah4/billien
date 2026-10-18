"use client";

import { SORT_OPTIONS, type SortId } from "@/lib/library";

/**
 * Sort control for the word list. A segmented control rather than a native
 * `<select>`: the native menu renders with the operating system's styling and
 * cannot follow the project tokens, and three short options do not need a
 * popup.
 */
export function SortControl({
  sort,
  onChange,
}: {
  sort: SortId;
  onChange: (sort: SortId) => void;
}) {
  return (
    <div
      className="inline-flex w-full rounded-lg border border-line bg-subtle p-0.5 sm:w-auto"
      role="group"
      aria-label="Sort words"
    >
      {SORT_OPTIONS.map((option) => {
        const active = sort === option.id;
        return (
          <button
            key={option.id}
            className={`inline-flex h-8 flex-1 items-center justify-center rounded-md px-2.5 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-none ${
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Letter filter. Only letters the library actually contains are offered, so a
 * chip never produces an empty list. `null` is the "All" state.
 */
export function LetterFilter({
  letters,
  value,
  onChange,
  total,
}: {
  letters: string[];
  value: string | null;
  onChange: (letter: string | null) => void;
  /** Shown on the "All" chip so the current scope is obvious. */
  total: number;
}) {
  if (letters.length === 0) return null;

  const chip = (active: boolean) =>
    `inline-flex size-8 shrink-0 items-center justify-center rounded-lg border text-[12px] font-semibold uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active
        ? "border-accent-line bg-accent-soft text-accent"
        : "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
    }`;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold tracking-wider text-faint uppercase">
        Letter
      </span>
      <div
        className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-0.5"
        role="group"
        aria-label="Filter by first letter"
      >
        <button
          className={`inline-flex h-8 shrink-0 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            value === null
              ? "border-accent-line bg-accent-soft text-accent"
              : "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
          }`}
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          All
          <span className="ml-1 tabular-nums opacity-60">{total}</span>
        </button>

        {letters.map((letter) => {
          const active = value === letter;
          return (
            <button
              key={letter}
              className={chip(active)}
              type="button"
              aria-pressed={active}
              aria-label={
                letter === "#"
                  ? "Words not starting with a letter"
                  : `Letter ${letter}`
              }
              onClick={() => onChange(active ? null : letter)}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
