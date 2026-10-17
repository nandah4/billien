"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app/app-header";
import { AuthModal } from "@/components/auth/auth-modal";
import { DetailAside } from "@/components/app/detail-aside";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { LanguageModal } from "@/components/preferences/language-modal";
import { WordListPanel } from "@/components/words/word-list-panel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useWordLibrary } from "@/hooks/use-word-library";
import {
  dictionaryQueryOptions,
  messageFor,
  preferencesQueryOptions,
  request,
  savedWordDetailQueryOptions,
  type ApiEnvelope,
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { DEFAULT_LANGUAGE } from "@/lib/language";
import {
  paginate,
  searchItems,
  sortItems,
  type LibraryWord,
  type SortId,
  type View,
} from "@/lib/library";
import type { SavedWord, UserPreferences } from "@/lib/types";

/** Typing pauses longer than this trigger a dictionary lookup. */
const SEARCH_DEBOUNCE_MS = 450;
const WORD_PATTERN = /^[a-z][a-z'-]*$/i;

export function EnWordsApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [view, setView] = useState<View>("discovery");
  const [query, setQuery] = useState("");
  // Discovery has no seeded list: the debounced query is the only lookup and the
  // only row shown there. `selectedName` decides whether its detail is open, so
  // switching views can collapse the panel without losing the result.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const lookupWord = useMemo(() => {
    const word = debouncedQuery.trim().toLowerCase();
    // Two characters is the shortest English word worth a request, and the
    // pattern keeps punctuation from reaching the API.
    return word.length >= 2 && WORD_PATTERN.test(word) ? word : null;
  }, [debouncedQuery]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [sort, setSort] = useState<SortId>("recent");
  const [page, setPage] = useState(1);
  const [selectedSavedWord, setSelectedSavedWord] = useState<SavedWord | null>(
    null,
  );
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [unsavingKey, setUnsavingKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const signedIn = Boolean(session?.user);
  const sessionLabel = signedIn ? session?.user?.name || "Learner" : "";

  const preferencesQuery = useQuery(preferencesQueryOptions(signedIn));
  const preferredLanguage =
    preferencesQuery.data?.translationLanguage ?? DEFAULT_LANGUAGE;

  const library = useWordLibrary(signedIn, preferredLanguage);

  const dictionaryQuery = useQuery({
    ...dictionaryQueryOptions(lookupWord ?? "", preferredLanguage),
    enabled: Boolean(lookupWord),
  });
  const savedDetailQuery = useQuery(
    savedWordDetailQueryOptions(selectedSavedId),
  );

  // The searched word is the only Discovery row. It is marked as saved once the
  // Remembered list confirms it, and it keeps the English definition as the
  // primary line (translations are a Remembered affordance).
  const discoveryItems = useMemo<LibraryWord[]>(() => {
    if (!lookupWord) return [];
    const saved = library.savedByKey.get(lookupWord);
    const entry = dictionaryQuery.data ?? null;
    // While the lookup is in flight (or after it failed) there is no row to
    // show; the list handles the loading and empty states.
    if (!entry && !saved) return [];
    return [
      {
        key: lookupWord,
        word: entry?.word ?? lookupWord,
        phonetic:
          entry?.entries[0]?.pronunciations[0]?.text ?? saved?.phonetic ?? null,
        entries: entry?.entries ?? saved?.entries ?? [],
        translation: [],
        savedWord: saved ?? null,
      },
    ];
  }, [lookupWord, dictionaryQuery.data, library.savedByKey]);

  const viewItems =
    view === "discovery" ? discoveryItems : library.rememberedItems;
  const visibleItems = useMemo(() => {
    // In Discovery the input is a lookup box, not a filter, so the typed text
    // must not hide the word already resolved for it.
    if (view === "discovery") return discoveryItems;
    return sortItems(searchItems(viewItems, query), sort);
  }, [view, discoveryItems, viewItems, query, sort]);
  const { pageCount, currentPage, pageItems } = paginate(visibleItems, page);

  // A selection is only valid while it still matches the current lookup; editing
  // the query closes a stale detail panel without an effect.
  const activeDictionaryWord =
    selectedName !== null && selectedName === lookupWord ? selectedName : null;
  const activeSavedWord =
    selectedSavedWord !== null &&
    (view === "remembered" || selectedSavedWord.normalized_word === lookupWord)
      ? selectedSavedWord
      : null;
  const activeSavedId =
    selectedSavedId !== null && activeSavedWord !== null
      ? selectedSavedId
      : null;

  const detailWord =
    activeSavedId !== null
      ? (savedDetailQuery.data ?? activeSavedWord)
      : activeDictionaryWord !== null
        ? (dictionaryQuery.data ?? null)
        : null;
  const detailSavedWord =
    detailWord && "id" in detailWord ? (detailWord as SavedWord) : null;
  // One key identifies the highlighted row whether it came from the saved list
  // or from a fresh dictionary lookup.
  const selectedKey =
    activeSavedWord?.normalized_word ?? activeDictionaryWord ?? null;
  const showDetailPanel =
    activeSavedId !== null || activeDictionaryWord !== null;
  const showSignInPrompt = view === "remembered" && !signedIn;
  const queryTrimmed = query.trim();
  const queryValid =
    queryTrimmed.length >= 2 && WORD_PATTERN.test(queryTrimmed.toLowerCase());
  const isListLoading =
    view === "discovery"
      ? queryValid &&
        (lookupWord === null ||
          (dictionaryQuery.isLoading && !library.savedByKey.has(lookupWord)))
      : isSessionPending || (signedIn && library.isLoading);
  const activeError = library.isError
    ? messageFor(library.error, "Unable to load your memorised words.")
    : null;
  // A 404 is an expected outcome for an unknown word, so it becomes the list's
  // empty state; anything else is a real failure worth an alert.
  const discoveryErrorMessage =
    view === "discovery" && lookupWord && dictionaryQuery.isError
      ? messageFor(dictionaryQuery.error, "Unable to look this word up.")
      : null;
  const listError =
    activeError ??
    (discoveryErrorMessage && discoveryErrorMessage !== "Word not found."
      ? discoveryErrorMessage
      : null);
  const detailError =
    activeSavedId !== null
      ? savedDetailQuery.isError && !activeSavedWord
        ? messageFor(savedDetailQuery.error, "Unable to load this word.")
        : null
      : activeDictionaryWord !== null && dictionaryQuery.isError
        ? messageFor(dictionaryQuery.error, "Unable to load dictionary detail.")
        : null;
  const detailLoading =
    activeSavedId !== null
      ? savedDetailQuery.isLoading && !activeSavedWord
      : activeDictionaryWord !== null && dictionaryQuery.isLoading;
  const showOnboarding =
    signedIn &&
    preferencesQuery.isSuccess &&
    preferencesQuery.data.onboardedAt === null;

  function openAuthModal() {
    setAuthOpen(true);
  }

  /** Closes the detail surface. */
  function closeDetail() {
    setSelectedName(null);
    setSelectedSavedWord(null);
    setSelectedSavedId(null);
  }

  /** Opens the searched word, preferring its saved record when one exists. */
  function openDiscoveryWord(word: string) {
    const saved = library.savedByKey.get(word);
    if (saved) {
      setSelectedName(null);
      setSelectedSavedWord(saved);
      setSelectedSavedId(saved.id);
      return;
    }
    setSelectedName(word);
    setSelectedSavedWord(null);
    setSelectedSavedId(null);
  }

  function selectLibraryWord(item: LibraryWord) {
    setNotice(null);
    if (view === "discovery") {
      openDiscoveryWord(item.key);
      return;
    }
    if (item.savedWord) {
      setSelectedSavedWord(item.savedWord);
      setSelectedSavedId(item.savedWord.id);
      setSelectedName(null);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    // The lookup already runs on the debounced value; Enter must not reload the
    // page or duplicate the request.
    event.preventDefault();
  }

  function changeView(next: View) {
    setView(next);
    setPage(1);
    setNotice(null);
    // Collapse the panel so a word from the other view is not carried over.
    setSelectedName(null);
    setSelectedSavedWord(null);
    setSelectedSavedId(null);
  }

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function changeSort(next: SortId) {
    setSort(next);
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setSort("recent");
    setPage(1);
  }

  function handlePreferencesSaved(preferences: UserPreferences) {
    queryClient.setQueryData<ApiEnvelope<UserPreferences>>(
      ["preferences"],
      (previous) =>
        previous ? { ...previous, data: preferences } : { data: preferences },
    );
    void queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
  }

  async function signOut() {
    setActionLoading(true);
    try {
      await authClient.signOut();
      queryClient.removeQueries({ queryKey: ["remembered-words"] });
      queryClient.removeQueries({ queryKey: ["streak"] });
      queryClient.removeQueries({ queryKey: ["preferences"] });
      setAuthOpen(false);
      setSelectedSavedWord(null);
      setSelectedSavedId(null);
      setSelectedName(null);
      setQuery("");
      setNotice("Signed out. Your progress remains safely in your account.");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function saveWord(name: string) {
    if (!signedIn) {
      openAuthModal();
      return null;
    }
    setSavingKey(name);
    setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord>>("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: name }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      setNotice(
        response.alreadySaved
          ? `"${name}" is already in your memorised list.`
          : `"${name}" was added to your memorised list.`,
      );
      return response.data;
    } catch (error) {
      setNotice(messageFor(error, "Unable to save this word."));
      return null;
    } finally {
      setSavingKey(null);
    }
  }

  async function saveSelected() {
    if (!detailWord) return;
    const saved = await saveWord(detailWord.word);
    if (saved) {
      setSelectedName(null);
      setSelectedSavedWord(saved);
      setSelectedSavedId(saved.id);
    }
  }

  async function unsaveWord(word: SavedWord) {
    if (unsavingKey) return;
    setUnsavingKey(word.id);
    setNotice(null);

    const cacheKey = ["remembered-words", preferredLanguage];
    const previous =
      queryClient.getQueryData<ApiEnvelope<SavedWord[]>>(cacheKey);
    queryClient.setQueryData<ApiEnvelope<SavedWord[]>>(cacheKey, (old) =>
      old
        ? { ...old, data: old.data.filter((item) => item.id !== word.id) }
        : old,
    );

    try {
      await request<ApiEnvelope<{ id: string }>>(`/api/words/${word.id}`, {
        method: "DELETE",
      });
      if (selectedSavedId === word.id) {
        setSelectedSavedId(null);
        setSelectedSavedWord(null);
        // Keep the Discovery detail open after un-saving its searched word.
        if (lookupWord === word.normalized_word) {
          setSelectedName(lookupWord);
        }
      }
      setNotice(`"${word.word}" was removed from Remembered.`);
    } catch (error) {
      queryClient.setQueryData(cacheKey, previous);
      setNotice(messageFor(error, "Unable to remove this word."));
    } finally {
      queryClient.removeQueries({ queryKey: ["remembered-word", word.id] });
      await queryClient.invalidateQueries({
        queryKey: ["remembered-words"],
      });
      setUnsavingKey(null);
    }
  }

  return (
    <>
      <div className="grid-pattern flex min-h-dvh flex-col bg-canvas px-4 pt-[4.5rem] pb-[calc(5rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:h-dvh lg:overflow-hidden lg:px-6 lg:pt-6 lg:pb-6">
        <div className="mx-auto flex w-full max-w-310 flex-col gap-4 lg:h-full lg:min-h-0">
          <AppHeader
            view={view}
            onChangeView={changeView}
            signedIn={signedIn}
            isSessionPending={isSessionPending}
            sessionLabel={sessionLabel}
            streak={library.streak}
            actionLoading={actionLoading}
            onSignOut={() => void signOut()}
            onSignIn={openAuthModal}
          />

          <div
            className="detail-split lg:min-h-0 lg:flex-1"
            style={
              {
                "--detail-track": showDetailPanel
                  ? "minmax(0, 1fr)"
                  : "minmax(0, 0fr)",
                "--detail-gap": showDetailPanel ? "1rem" : "0rem",
              } as CSSProperties
            }
          >
            <WordListPanel
              view={view}
              search={{
                value: query,
                onChange: changeQuery,
                onSubmit: handleSearchSubmit,
              }}
              sort={sort}
              items={pageItems}
              pagination={{
                page: currentPage,
                pageCount,
                total: visibleItems.length,
                onPrevious: () => setPage(Math.max(1, currentPage - 1)),
                onNext: () => setPage(Math.min(pageCount, currentPage + 1)),
              }}
              notice={notice}
              errorMessage={listError}
              isLoading={isListLoading}
              showSignInPrompt={showSignInPrompt}
              hasAnyItems={viewItems.length > 0}
              isDiscoveryIdle={view === "discovery" && queryTrimmed === ""}
              isDiscoveryTooShort={
                view === "discovery" && queryTrimmed !== "" && !queryValid
              }
              savedCount={library.savedWords.length}
              selectedKey={selectedKey}
              savingKey={savingKey}
              unsavingKey={unsavingKey}
              onSelect={selectLibraryWord}
              onSave={(word) => void saveWord(word)}
              onUnsave={
                view === "remembered"
                  ? (item) => {
                      if (item.savedWord) void unsaveWord(item.savedWord);
                    }
                  : undefined
              }
              onSignIn={openAuthModal}
              onChangeSort={changeSort}
              onResetFilters={resetFilters}
              onRetry={() => {
                if (view === "discovery") void dictionaryQuery.refetch();
                else void library.refetch();
              }}
              onGoToDiscovery={() => changeView("discovery")}
            />

            <DetailAside
              open={showDetailPanel}
              detail={{
                word: detailWord,
                preferredLanguage,
                isLoading: detailLoading,
                errorMessage: detailError,
                isSaving: Boolean(detailWord && savingKey === detailWord.word),
                isUnsaving: Boolean(
                  detailSavedWord && unsavingKey === detailSavedWord.id,
                ),
                onSave:
                  signedIn && detailWord && !detailSavedWord
                    ? () => void saveSelected()
                    : undefined,
                onUnsave: detailSavedWord
                  ? () => void unsaveWord(detailSavedWord)
                  : undefined,
                onSignIn: !signedIn ? openAuthModal : undefined,
                onRetry: () => {
                  if (activeSavedId) void savedDetailQuery.refetch();
                  else if (lookupWord) void dictionaryQuery.refetch();
                },
              }}
              onClose={closeDetail}
            />
          </div>

          {/*<AppFooter />*/}
        </div>
      </div>

      <MobileBottomNav
        view={view}
        onChangeView={changeView}
        signedIn={signedIn}
        onSignIn={openAuthModal}
      />

      <AuthModal
        open={authOpen && !signedIn}
        onClose={() => setAuthOpen(false)}
      />

      {showOnboarding ? (
        <LanguageModal
          currentLanguage={preferredLanguage}
          onSaved={handlePreferencesSaved}
        />
      ) : null}
    </>
  );
}
