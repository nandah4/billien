"use client";

import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, LogIn, Search, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryToolbar } from "@/components/words/library-filters";
import { WordRow } from "@/components/words/word-row";
import emptyImage from "@/public/assets/empty.png";
import helloImage from "@/public/assets/hello.webp";
import type { LibraryWord, SortId } from "@/lib/library";
import type { View } from "@/lib/navigation";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";

/** Card wrapper shared by every non-list state, so they keep one silhouette. */
function StateCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-subtle px-6 py-8">
      {children}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          className="h-[68px] animate-pulse rounded-xl border border-line bg-subtle"
          key={index}
        />
      ))}
    </div>
  );
}

export function WordListPanel({
  view,
  search,
  sort,
  letter,
  letters,
  libraryCount,
  items,
  pagination,
  errorMessage,
  isLoading,
  showSignInPrompt,
  hasAnyItems,
  isDiscoveryIdle,
  isDiscoveryTooShort,
  savedCount,
  selectedKey,
  savingKey,
  unsavingKey,
  onSelect,
  onSave,
  onUnsave,
  onSignIn,
  onChangeSort,
  onChangeLetter,
  onResetFilters,
  onRetry,
  onGoToDiscovery,
}: {
  view: View;
  search: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  };
  sort: SortId;
  /** Active first-letter filter, or `null` for every letter. */
  letter: string | null;
  /** Letters the library contains, for the chips. */
  letters: string[];
  /** Unfiltered count, so the "All" chip can show the full scope. */
  libraryCount: number;
  items: LibraryWord[];
  pagination: {
    page: number;
    pageCount: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
  };
  errorMessage: string | null;
  isLoading: boolean;
  showSignInPrompt: boolean;
  hasAnyItems: boolean;
  isDiscoveryIdle: boolean;
  isDiscoveryTooShort: boolean;
  savedCount: number;
  selectedKey: string | null;
  savingKey: string | null;
  unsavingKey: string | null;
  onSelect: (item: LibraryWord) => void;
  onSave: (word: string) => void;
  onUnsave?: (item: LibraryWord) => void;
  onSignIn: () => void;
  onChangeSort: (sort: SortId) => void;
  onChangeLetter: (letter: string | null) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onGoToDiscovery: () => void;
}) {
  const filteredEmpty = !isLoading && items.length === 0 && hasAnyItems;

  return (
    <section className={`${cardClass} flex min-w-0 flex-col lg:min-h-0`}>
      <div className="shrink-0 border-b border-line p-4">
        <form
          className="flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2.5 transition focus-within:border-accent focus-within:bg-surface sm:py-2"
          onSubmit={search.onSubmit}
          role="search"
        >
          <Search
            size={16}
            className="shrink-0 text-faint"
            aria-hidden="true"
          />
          <input
            className="w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-placeholder sm:text-[13px]"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={
              view === "remembered"
                ? "Search a word or translation…"
                : "Search an English word…"
            }
            aria-label={
              view === "remembered"
                ? "Search a word or translation"
                : "Search an English word"
            }
          />
          {search.value ? (
            <button
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-faint transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              type="button"
              onClick={() => search.onChange("")}
              aria-label="Clear search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </form>

        {view === "remembered" ? (
          <LibraryToolbar
            sort={sort}
            onSort={onChangeSort}
            letters={letters}
            value={letter}
            onLetter={onChangeLetter}
            total={libraryCount}
          />
        ) : null}
      </div>

      <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {errorMessage ? (
          <div
            className="mb-3 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2 text-[12px] text-hard"
            role="alert"
          >
            <p>{errorMessage}</p>
            <button
              className="mt-2 inline-flex h-8 items-center justify-center rounded-lg border border-hard-soft bg-surface px-2.5 text-[12px] font-semibold text-hard transition hover:bg-hard-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              type="button"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        ) : null}
        {showSignInPrompt ? (
          <StateCard>
            <EmptyState
              image={helloImage}
              title="Your words, kept safe"
              description="Sign in to keep a private list of the words you have memorised."
              action={
                <button
                  className={primaryButton}
                  type="button"
                  onClick={onSignIn}
                >
                  <LogIn size={15} aria-hidden="true" />
                  Sign in
                </button>
              }
            />
          </StateCard>
        ) : isLoading && items.length === 0 ? (
          <ListSkeleton />
        ) : isDiscoveryIdle ? (
          <StateCard>
            <EmptyState
              image={emptyImage}
              title="Start with a word"
              description="Type at least two letters and the result appears here automatically."
            />
          </StateCard>
        ) : isDiscoveryTooShort ? (
          <div className="rounded-xl border border-line bg-subtle px-4 py-10 text-center text-[13px] text-muted">
            Type an English word with at least 2 letters and no digits.
          </div>
        ) : filteredEmpty ? (
          <StateCard>
            <EmptyState
              image={emptyImage}
              title="No matching words"
              description="Nothing matches this search. Try another spelling or clear the filters."
              action={
                <button
                  className={outlineButton}
                  type="button"
                  onClick={onResetFilters}
                >
                  Reset filters
                </button>
              }
            />
          </StateCard>
        ) : items.length === 0 ? (
          <StateCard>
            {view === "remembered" ? (
              <EmptyState
                image={emptyImage}
                title="Nothing saved yet"
                description="Search a word in Discovery and mark it as memorised to build your list."
                action={
                  <button
                    className={primaryButton}
                    type="button"
                    onClick={onGoToDiscovery}
                  >
                    Find words in Discovery
                  </button>
                }
              />
            ) : (
              <EmptyState
                image={emptyImage}
                title="Word not found"
                description="We could not find that word. Check the spelling or try another one."
              />
            )}
          </StateCard>
        ) : (
          <ul className="grid list-none gap-2 p-0">
            {items.map((item) => (
              <li key={item.key}>
                <WordRow
                  item={item}
                  active={selectedKey === item.key}
                  saving={savingKey === item.key}
                  unsaving={unsavingKey === item.key}
                  onSelect={onSelect}
                  onSave={onSave}
                  onUnsave={onUnsave}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination.total > 0 ? (
        <div className="flex shrink-0 flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-muted">
            Showing <strong className="text-ink">{items.length}</strong> of{" "}
            <strong className="text-ink">{pagination.total}</strong>{" "}
            {pagination.total === 1 ? "word" : "words"}
            {savedCount > 0 ? (
              <>
                {" · "}
                <span className="font-semibold text-easy">
                  {savedCount} memorised
                </span>
              </>
            ) : null}
          </p>
          {pagination.pageCount > 1 ? (
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
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
