"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DetailAside } from "@/components/app/detail-aside";
import { useAppShell } from "@/components/app/app-shell-context";
import { WordListPanel } from "@/components/words/word-list-panel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useWordActions } from "@/hooks/use-word-actions";
import { useWordLibrary } from "@/hooks/use-word-library";
import {
  dictionaryQueryOptions,
  messageFor,
  savedWordDetailQueryOptions,
} from "@/lib/api";
import type { LibraryWord } from "@/lib/library";
import type { DictionaryResult, SavedWord } from "@/lib/types";

/** Typing pauses longer than this trigger a dictionary lookup. */
const SEARCH_DEBOUNCE_MS = 450;
const WORD_PATTERN = /^[a-z][a-z'-]*$/i;

/**
 * `/` — look up any English word. There is no seeded list: the debounced query
 * resolves to a single row, and the detail panel opens on click.
 */
export function DiscoveryView() {
  const { signedIn, preferredLanguage, openAuth } = useAppShell();
  const library = useWordLibrary(signedIn, preferredLanguage);
  const actions = useWordActions();

  const [query, setQuery] = useState("");
  // The clicked word. Validity is derived, so editing the query closes a stale
  // detail panel without an effect.
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const lookupWord = useMemo(() => {
    const word = debouncedQuery.trim().toLowerCase();
    // Two characters is the shortest English word worth a request, and the
    // pattern keeps punctuation from reaching the API.
    return word.length >= 2 && WORD_PATTERN.test(word) ? word : null;
  }, [debouncedQuery]);

  const queryTrimmed = query.trim();
  const queryValid =
    queryTrimmed.length >= 2 && WORD_PATTERN.test(queryTrimmed.toLowerCase());

  const dictionaryQuery = useQuery({
    ...dictionaryQueryOptions(lookupWord ?? "", preferredLanguage),
    enabled: Boolean(lookupWord),
  });

  const savedWord = lookupWord ? library.savedByKey.get(lookupWord) : undefined;
  const savedDetailQuery = useQuery(
    savedWordDetailQueryOptions(savedWord?.id ?? null),
  );

  const items = useMemo<LibraryWord[]>(() => {
    if (!lookupWord) return [];
    const entry = dictionaryQuery.data ?? null;
    // While the lookup is in flight (or after it failed) there is no row to
    // show; the list handles the loading and empty states.
    if (!entry && !savedWord) return [];
    return [
      {
        key: lookupWord,
        word: entry?.word ?? lookupWord,
        phonetic:
          entry?.entries[0]?.pronunciations[0]?.text ??
          savedWord?.phonetic ??
          null,
        entries: entry?.entries ?? savedWord?.entries ?? [],
        // Discovery keeps the English definition as the primary line;
        // translations are a Remembered affordance.
        translation: [],
        savedWord: savedWord ?? null,
      },
    ];
  }, [lookupWord, dictionaryQuery.data, savedWord]);

  const isSelected = selectedName !== null && selectedName === lookupWord;
  const detailWord: SavedWord | DictionaryResult | null = isSelected
    ? savedWord
      ? (savedDetailQuery.data ?? savedWord)
      : (dictionaryQuery.data ?? null)
    : null;
  const detailSavedWord =
    detailWord && "id" in detailWord ? (detailWord as SavedWord) : null;

  const isListLoading =
    queryValid &&
    (lookupWord === null || (dictionaryQuery.isLoading && !savedWord));

  // A 404 is an expected outcome for an unknown word, so it becomes the list's
  // empty state; anything else is a real failure worth an alert.
  const lookupError =
    lookupWord && dictionaryQuery.isError
      ? messageFor(dictionaryQuery.error, "Unable to look this word up.")
      : null;
  const listError = lookupError !== "Word not found." ? lookupError : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // The lookup already runs on the debounced value; Enter must not reload the
    // page or duplicate the request.
    event.preventDefault();
  }

  function resetSearch() {
    setQuery("");
    setSelectedName(null);
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
        view="discovery"
        search={{
          value: query,
          onChange: (value) => {
            setQuery(value);
          },
          onSubmit: handleSubmit,
        }}
        sort="recent"
        letter={null}
        letters={[]}
        libraryCount={items.length}
        items={items}
        pagination={{
          page: 1,
          pageCount: 1,
          total: items.length,
          onPrevious: () => {},
          onNext: () => {},
        }}
        errorMessage={listError}
        isLoading={isListLoading}
        showSignInPrompt={false}
        hasAnyItems={items.length > 0}
        isDiscoveryIdle={queryTrimmed === ""}
        isDiscoveryTooShort={queryTrimmed !== "" && !queryValid}
        savedCount={library.savedWords.length}
        selectedKey={isSelected ? selectedName : null}
        savingKey={actions.savingKey}
        unsavingKey={null}
        onSelect={(item) => setSelectedName(item.key)}
        onSave={(word) => void actions.saveWord(word)}
        onSignIn={openAuth}
        onChangeSort={() => {}}
        onChangeLetter={() => {}}
        onResetFilters={resetSearch}
        onRetry={() => void dictionaryQuery.refetch()}
        onGoToDiscovery={resetSearch}
      />

      <DetailAside
        open={isSelected}
        detail={{
          word: detailWord,
          preferredLanguage,
          isLoading: isSelected && !detailWord && dictionaryQuery.isLoading,
          errorMessage:
            isSelected && !savedWord && dictionaryQuery.isError
              ? messageFor(
                  dictionaryQuery.error,
                  "Unable to load dictionary detail.",
                )
              : null,
          isSaving: Boolean(
            detailWord && actions.savingKey === detailWord.word,
          ),
          isReviewing: Boolean(
            detailSavedWord && actions.reviewingKey === detailSavedWord.id,
          ),
          onSave:
            signedIn && detailWord && !detailSavedWord
              ? () => void actions.saveWord(detailWord.word)
              : undefined,
          onReview: detailSavedWord
            ? () => void actions.reviewWord(detailSavedWord)
            : undefined,
          onSignIn: signedIn ? undefined : openAuth,
          onRetry: () => {
            if (detailSavedWord) void savedDetailQuery.refetch();
            else void dictionaryQuery.refetch();
          },
        }}
        onClose={() => setSelectedName(null)}
      />
    </div>
  );
}
