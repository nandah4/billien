"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DetailAside } from "@/components/app/detail-aside";
import { useAppShell } from "@/components/app/app-shell-context";
import { WordListPanel } from "@/components/words/word-list-panel";
import { useWordActions } from "@/hooks/use-word-actions";
import { useWordLibrary } from "@/hooks/use-word-library";
import { messageFor, savedWordDetailQueryOptions } from "@/lib/api";
import {
  DEFAULT_SORT,
  PAGE_SIZE,
  availableLetters,
  filterByLetter,
  paginate,
  searchItems,
  sortItems,
  type SortId,
} from "@/lib/library";
import type { SavedWord } from "@/lib/types";

/**
 * `/remembered` — the signed-in user's saved words. Search, sorting, and
 * un-saving all happen here; the detail panel loads every language so a
 * preference change applies without another round-trip.
 */
export function RememberedView() {
  const router = useRouter();
  const { signedIn, isSessionPending, preferredLanguage, openAuth } =
    useAppShell();
  const library = useWordLibrary(signedIn, preferredLanguage);
  const actions = useWordActions();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>(DEFAULT_SORT);
  const [letter, setLetter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searched = useMemo(
    () => searchItems(library.rememberedItems, query),
    [library.rememberedItems, query],
  );

  // Which letters actually hold words; the toolbar dims the rest but still
  // offers them, so the filter never looks like it collapsed to one chip.
  const letters = useMemo(() => availableLetters(searched), [searched]);

  const visibleItems = useMemo(
    () => sortItems(filterByLetter(searched, letter), sort),
    [searched, letter, sort],
  );
  const { pageCount, currentPage, pageItems } = paginate(visibleItems, page);

  // Prev/next in the detail panel walks the whole filtered list, so a jump
  // across a page boundary also moves the list under it.
  const selectedIndex = selectedId
    ? visibleItems.findIndex((item) => item.savedWord?.id === selectedId)
    : -1;

  function selectAt(index: number) {
    const target = visibleItems[index];
    if (!target?.savedWord) return;
    setSelectedId(target.savedWord.id);
    setPage(Math.floor(index / PAGE_SIZE) + 1);
  }

  const navigation =
    selectedIndex >= 0
      ? {
          index: selectedIndex,
          total: visibleItems.length,
          onPrevious: () => selectAt(selectedIndex - 1),
          onNext: () => selectAt(selectedIndex + 1),
        }
      : undefined;

  const selectedSavedWord =
    library.rememberedItems.find((item) => item.savedWord?.id === selectedId)
      ?.savedWord ?? null;
  const savedDetailQuery = useQuery(savedWordDetailQueryOptions(selectedId));
  const detailWord: SavedWord | null =
    selectedId !== null ? (savedDetailQuery.data ?? selectedSavedWord) : null;

  const isListLoading = isSessionPending || (signedIn && library.isLoading);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Filtering is local and instant; Enter must not reload the page.
    event.preventDefault();
  }

  function resetFilters() {
    setQuery("");
    setSort(DEFAULT_SORT);
    setLetter(null);
    setPage(1);
  }

  async function handleUnsave(word: SavedWord) {
    const removed = await actions.unsaveWord(word);
    if (removed && selectedId === word.id) setSelectedId(null);
  }

  return (
    <div
      className="detail-split lg:min-h-0 lg:flex-1"
      style={
        {
          "--detail-track": detailWord ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
          "--detail-gap": detailWord ? "1rem" : "0rem",
        } as CSSProperties
      }
    >
      <WordListPanel
        view="remembered"
        search={{
          value: query,
          onChange: (value) => {
            setQuery(value);
            setPage(1);
          },
          onSubmit: handleSubmit,
        }}
        sort={sort}
        letter={letter}
        letters={letters}
        libraryCount={searched.length}
        items={pageItems}
        pagination={{
          page: currentPage,
          pageCount,
          total: visibleItems.length,
          onPrevious: () => setPage(Math.max(1, currentPage - 1)),
          onNext: () => setPage(Math.min(pageCount, currentPage + 1)),
        }}
        errorMessage={
          library.isError
            ? messageFor(library.error, "Unable to load your memorised words.")
            : null
        }
        isLoading={isListLoading}
        showSignInPrompt={!signedIn}
        hasAnyItems={library.rememberedItems.length > 0}
        isDiscoveryIdle={false}
        isDiscoveryTooShort={false}
        savedCount={library.savedWords.length}
        selectedKey={selectedSavedWord?.normalized_word ?? null}
        savingKey={actions.savingKey}
        unsavingKey={actions.unsavingKey}
        onSelect={(item) => {
          if (item.savedWord) setSelectedId(item.savedWord.id);
        }}
        onSave={(word) => void actions.saveWord(word)}
        onUnsave={(item) => {
          if (item.savedWord) void handleUnsave(item.savedWord);
        }}
        onSignIn={openAuth}
        onChangeSort={(next) => {
          setSort(next);
          setPage(1);
        }}
        onChangeLetter={(next) => {
          setLetter(next);
          setPage(1);
        }}
        onResetFilters={resetFilters}
        onRetry={() => void library.refetch()}
        onGoToDiscovery={() => router.push("/")}
      />

      <DetailAside
        open={selectedId !== null}
        detail={{
          word: detailWord,
          preferredLanguage,
          isLoading: selectedId !== null && !detailWord,
          errorMessage:
            selectedId !== null && savedDetailQuery.isError && !detailWord
              ? messageFor(savedDetailQuery.error, "Unable to load this word.")
              : null,
          isSaving: false,
          isReviewing: Boolean(
            detailWord && actions.reviewingKey === detailWord.id,
          ),
          onReview: detailWord
            ? () => void actions.reviewWord(detailWord)
            : undefined,
          onRetry: () => void savedDetailQuery.refetch(),
          navigation,
        }}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
