"use client";

import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, LogIn, Search, X } from "lucide-react";
import { WordRow } from "@/components/words/word-row";
import type { FilterId, FilterOption, LibraryWord, View } from "@/lib/library";
import { cardClass, primaryButton } from "@/lib/ui";

export function WordListPanel({
  view,
  search,
  filters,
  items,
  pagination,
  notice,
  errorMessage,
  isLoading,
  showSignInPrompt,
  savedCount,
  selectedKey,
  savingKey,
  onSelect,
  onSave,
  onSignIn,
}: {
  view: View;
  search: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  };
  filters: {
    items: FilterOption[];
    active: FilterId;
    onChange: (id: FilterId) => void;
  };
  items: LibraryWord[];
  pagination: {
    page: number;
    pageCount: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
  };
  notice: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  showSignInPrompt: boolean;
  savedCount: number;
  selectedKey: string | null;
  savingKey: string | null;
  onSelect: (item: LibraryWord) => void;
  onSave: (word: string) => void;
  onSignIn: () => void;
}) {
  const normalizedQuery = search.value.trim().toLowerCase();

  return (
    <section className={`${cardClass} flex min-w-0 flex-col lg:min-h-0`}>
      <div className="shrink-0 border-b border-line p-4">
        <form
          className="flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 transition focus-within:border-accent focus-within:bg-surface"
          onSubmit={search.onSubmit}
          role="search"
        >
          <Search
            size={16}
            className="shrink-0 text-faint"
            aria-hidden="true"
          />
          <input
            className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-placeholder"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder="Search an English word…"
            aria-label="Search an English word"
          />
          {normalizedQuery ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
              Filter: &ldquo;{search.value.trim()}&rdquo;
              <button
                className="inline-flex items-center justify-center rounded-full transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                type="button"
                onClick={() => search.onChange("")}
                aria-label="Clear the search filter"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ) : null}
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {filters.items.map((item) => {
            const active = filters.active === item.id;
            return (
              <button
                key={item.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? "border-primary bg-primary text-surface"
                    : "border-line bg-surface text-muted hover:bg-hover"
                }`}
                type="button"
                aria-pressed={active}
                onClick={() => filters.onChange(item.id)}
              >
                {item.label}
                <span className={active ? "text-surface/70" : "text-faint"}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {errorMessage ? (
          <p
            className="mb-3 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2 text-[12px] text-hard"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {notice ? (
          <p
            className="mb-3 rounded-lg border border-line bg-sunken px-3 py-2 text-[12px] text-ink-soft"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        {showSignInPrompt ? (
          <div className="rounded-xl border border-line bg-subtle px-4 py-10 text-center">
            <p className="text-[13px] text-muted">
              Sign in to keep a private list of the words you have memorised.
            </p>
            <button
              className={`${primaryButton} mt-4`}
              type="button"
              onClick={onSignIn}
            >
              <LogIn size={15} aria-hidden="true" />
              Sign in
            </button>
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            Loading your word library…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-line bg-subtle px-4 py-10 text-center text-[12px] text-muted">
            {view === "remembered" ? (
              <>
                No memorised words match this view yet.
                <br />
                Add a word from Discovery first.
              </>
            ) : (
              <>
                No words match this view yet.
                <br />
                Type a word above and press Enter to look it up.
              </>
            )}
          </div>
        ) : (
          <ul className="grid list-none gap-2 p-0">
            {items.map((item) => (
              <li key={item.key}>
                <WordRow
                  item={item}
                  active={selectedKey === item.key}
                  saving={savingKey === item.key}
                  onSelect={onSelect}
                  onSave={onSave}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-muted">
          Showing <strong className="text-ink">{items.length}</strong> of{" "}
          <strong className="text-ink">{pagination.total}</strong> words
          {savedCount > 0 ? (
            <>
              {" · "}
              <span className="font-semibold text-easy">
                {savedCount} memorised
              </span>
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            disabled={pagination.page <= 1}
            onClick={pagination.onPrevious}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Previous
          </button>
          <span className="text-[12px] text-muted">
            Page {pagination.page} of {pagination.pageCount}
          </span>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            disabled={pagination.page >= pagination.pageCount}
            onClick={pagination.onNext}
          >
            Next
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
