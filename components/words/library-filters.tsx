"use client";

import { useState } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { Modal } from "@/components/ui/modal";
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
 * Letter filter. The alphabet does not fit in the toolbar: twenty-six chips in a
 * row either wrap into three lines or scroll horizontally, and both read badly
 * next to the sort control. It opens a dialog instead, where the grid is legible
 * and the trigger costs one short label.
 *
 * Every letter is offered. Letters with no words are dimmed rather than removed,
 * so the filter never looks like it collapsed.
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
  /** Shown on the trigger and the "All" option so the scope is obvious. */
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const present = new Set(letters);
  const buckets = present.has(OTHER_LETTER)
    ? [...ALPHABET, OTHER_LETTER]
    : ALPHABET;

  function choose(letter: string | null) {
    onLetter(letter);
    setOpen(false);
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <SortControl sort={sort} onChange={onSort} />

        <button
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <ListFilter size={13} className="text-muted" aria-hidden="true" />
          {value === null ? "All letters" : value.toUpperCase()}
          <ChevronDown size={13} className="text-faint" aria-hidden="true" />
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="letter-filter-title"
        describedBy="letter-filter-description"
        maxWidthClass="max-w-sm"
      >
        <h2
          id="letter-filter-title"
          className="text-[16px] leading-tight font-semibold text-ink"
        >
          Filter by first letter
        </h2>
        <p
          id="letter-filter-description"
          className="mt-1 text-[12px] leading-relaxed text-muted"
        >
          {total} {total === 1 ? "word" : "words"} in this list. Dimmed letters
          have no saved words yet.
        </p>

        <button
          className={`mt-4 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            value === null
              ? "border-accent-line bg-accent-soft text-accent"
              : "border-line bg-surface text-ink hover:bg-hover"
          }`}
          type="button"
          aria-pressed={value === null}
          onClick={() => choose(null)}
        >
          All letters
          <span className="text-[12px] font-medium text-muted">{total}</span>
        </button>

        <div
          className="mt-2 grid grid-cols-6 gap-1.5"
          role="group"
          aria-label="Letters"
        >
          {buckets.map((letter) => {
            const active = value === letter;
            const hasWords = present.has(letter);
            return (
              <button
                key={letter}
                className={`flex h-10 items-center justify-center rounded-lg border text-[13px] font-semibold uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? "border-accent-line bg-accent-soft text-accent"
                    : hasWords
                      ? "border-line bg-surface text-ink hover:border-accent-line hover:bg-hover"
                      : "border-transparent bg-subtle text-faint/70 hover:border-line hover:text-muted"
                }`}
                type="button"
                aria-pressed={active}
                aria-label={
                  letter === OTHER_LETTER
                    ? "Words not starting with a letter"
                    : `Letter ${letter}${hasWords ? "" : ", no words yet"}`
                }
                onClick={() => choose(active ? null : letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <button
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-line bg-surface text-[12px] font-semibold text-ink transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </Modal>
    </div>
  );
}
