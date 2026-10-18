"use client";

import {
  ALPHABET,
  OTHER_LETTER,
  SORT_OPTIONS,
  type SortId,
} from "@/lib/library";

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
      className="inline-flex rounded-lg bg-subtle p-0.5"
      role="group"
      aria-label="Sort words"
    >
      {SORT_OPTIONS.map((option) => {
        const active = sort === option.id;
        return (
          <button
            key={option.id}
            className={`inline-flex h-7 flex-1 items-center justify-center rounded-md px-2.5 text-[11px] font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex-none ${
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
 * Letter filter, drawn as one toolbar card with the sort control.
 *
 * The whole alphabet is always offered, not just the letters in the library: a
 * filter that silently shrinks to one chip looks broken. Letters without words
 * are dimmed so the state is visible before clicking, and `#` appears only when
 * a word starts with something other than a letter.
 */
export function LibraryToolbar({
  sort,
  onSort,
  letters,
  value,
  onLetter,
  total,
}: {
  sort: SortId;
  onSort: (sort: SortId) => void;
  /** Letters that currently have words. */
  letters: string[];
  value: string | null;
  onLetter: (letter: string | null) => void;
  /** Shown on the "All" chip so the current scope is obvious. */
  total: number;
}) {
  const present = new Set(letters);
  const buckets = present.has(OTHER_LETTER)
    ? [...ALPHABET, OTHER_LETTER]
    : ALPHABET;

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SortControl sort={sort} onChange={onSort} />
        <span className="hidden text-[11px] text-muted sm:block">
          {total} {total === 1 ? "word" : "words"}
        </span>
      </div>

      <div
        className="mt-2 flex gap-1 overflow-x-auto border-t border-line-soft pt-2"
        role="group"
        aria-label="Filter by first letter"
      >
        <button
          className={`inline-flex h-7 shrink-0 items-center rounded-md border px-2 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            value === null
              ? "border-accent-line bg-accent-soft text-accent"
              : "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
          }`}
          type="button"
          aria-pressed={value === null}
          onClick={() => onLetter(null)}
        >
          All
          <span className="ml-1 tabular-nums opacity-60">{total}</span>
        </button>

        {buckets.map((letter) => {
          const active = value === letter;
          const hasWords = present.has(letter);
          return (
            <button
              key={letter}
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                active
                  ? "border-accent-line bg-accent-soft text-accent"
                  : hasWords
                    ? "border-line bg-surface text-muted hover:border-accent-line hover:text-ink"
                    : "border-transparent bg-subtle text-faint/70 hover:border-line hover:text-muted"
              }`}
              type="button"
              aria-pressed={active}
              aria-label={
                letter === OTHER_LETTER
                  ? "Words not starting with a letter"
                  : `Letter ${letter}${hasWords ? "" : ", no words yet"}`
              }
              title={hasWords ? undefined : "No saved words yet"}
              onClick={() => onLetter(active ? null : letter)}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
