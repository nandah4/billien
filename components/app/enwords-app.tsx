"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app/app-header";
import { AuthModal } from "@/components/auth/auth-modal";
import { DetailAside } from "@/components/app/detail-aside";
import { LanguageModal } from "@/components/preferences/language-modal";
import { WordListPanel } from "@/components/words/word-list-panel";
import { useDrill } from "@/hooks/use-drill";
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
  buildFilters,
  filterItems,
  paginate,
  sortItems,
  type FilterId,
  type LibraryWord,
  type SortId,
  type View,
} from "@/lib/library";
import type { SavedWord, UserPreferences } from "@/lib/types";

export function EnWordsApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [view, setView] = useState<View>("discovery");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("recent");
  const [page, setPage] = useState(1);
  const [selectedName, setSelectedName] = useState<string | null>(null);
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
  const drill = useDrill({
    signedIn,
    onRequireAuth: openAuthModal,
    onNotice: setNotice,
  });

  const dictionaryQuery = useQuery({
    ...dictionaryQueryOptions(selectedName ?? "", preferredLanguage),
    enabled: Boolean(selectedName),
  });
  const savedDetailQuery = useQuery(
    savedWordDetailQueryOptions(selectedSavedId),
  );

  const viewItems =
    view === "discovery" ? library.discoveryItems : library.rememberedItems;
  const filters = useMemo(() => buildFilters(viewItems), [viewItems]);
  const visibleItems = useMemo(
    () =>
      sortItems(
        filterItems(viewItems, { query, filter }),
        view === "remembered" ? sort : "recent",
      ),
    [viewItems, query, filter, sort, view],
  );
  const { pageCount, currentPage, pageItems } = paginate(visibleItems, page);

  const detailWord =
    selectedSavedId !== null
      ? (savedDetailQuery.data ?? selectedSavedWord)
      : (dictionaryQuery.data ?? null);
  const detailSavedWord =
    detailWord && "id" in detailWord ? (detailWord as SavedWord) : null;
  // One key identifies the highlighted row whether it came from the saved list
  // or from a fresh dictionary lookup.
  const selectedKey = selectedSavedWord?.normalized_word ?? selectedName;
  // Keep the panel mounted while a lookup is in flight so its loading state is
  // visible; `selectedName` is set as soon as a word is clicked.
  const showDetailPanel =
    drill.active ||
    Boolean(detailWord) ||
    Boolean(selectedName) ||
    selectedSavedId !== null;
  const showDrillLauncher = view === "remembered" && signedIn && !drill.active;
  const showSignInPrompt = view === "remembered" && !signedIn;
  const isListLoading =
    view === "remembered" &&
    (isSessionPending || (signedIn && library.isLoading));
  const activeError = library.isError
    ? messageFor(library.error, "Unable to load your memorised words.")
    : null;
  const detailError =
    selectedName && dictionaryQuery.isError
      ? messageFor(dictionaryQuery.error, "Unable to load dictionary detail.")
      : selectedSavedId && savedDetailQuery.isError && !selectedSavedWord
        ? messageFor(savedDetailQuery.error, "Unable to load this word.")
        : null;
  const detailLoading =
    (Boolean(selectedName) && dictionaryQuery.isLoading) ||
    (selectedSavedId !== null &&
      savedDetailQuery.isLoading &&
      !selectedSavedWord);
  const showOnboarding =
    signedIn &&
    preferencesQuery.isSuccess &&
    preferencesQuery.data.onboardedAt === null;

  const drillIds = useMemo(
    () =>
      visibleItems
        .map((item) => item.savedWord?.id)
        .filter((id): id is string => Boolean(id))
        .slice(0, 50),
    [visibleItems],
  );

  function openAuthModal() {
    setAuthOpen(true);
  }

  function selectLibraryWord(item: LibraryWord) {
    setNotice(null);
    if (item.savedWord) {
      setSelectedSavedWord(item.savedWord);
      setSelectedSavedId(item.savedWord.id);
      setSelectedName(null);
      return;
    }
    setSelectedSavedWord(null);
    setSelectedSavedId(null);
    setSelectedName(item.key);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Remembered filters live as the user types; Enter must not open a lookup.
    if (view === "remembered") return;
    const word = query.trim().toLowerCase();
    if (!/^[a-z][a-z'-]*$/i.test(word)) {
      setNotice("Enter one valid English word to look it up.");
      return;
    }
    setSelectedSavedWord(null);
    setSelectedSavedId(null);
    setSelectedName(word);
    setNotice(null);
  }

  function changeView(next: View) {
    setView(next);
    setPage(1);
    setNotice(null);
  }

  function changeFilter(next: FilterId) {
    setFilter(next);
    setPage(1);
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
    setFilter("all");
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
      drill.close();
      setAuthOpen(false);
      setSelectedSavedWord(null);
      setSelectedSavedId(null);
      setSelectedName(null);
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
      }
      setNotice(`"${word.word}" dihapus dari Remembered.`);
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
      <div className="grid-pattern flex min-h-dvh flex-col bg-canvas px-4 py-5 sm:px-6 sm:py-6 lg:h-dvh lg:overflow-hidden">
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
              filters={{
                items: filters,
                active: filter,
                onChange: changeFilter,
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
              errorMessage={activeError}
              isLoading={isListLoading}
              showSignInPrompt={showSignInPrompt}
              hasAnyItems={viewItems.length > 0}
              savedCount={library.savedWords.length}
              selectedKey={selectedKey}
              savingKey={savingKey}
              unsavingKey={unsavingKey}
              onSelect={selectLibraryWord}
              onSave={(word) => void saveWord(word)}
              onUnsave={(item) => {
                if (item.savedWord) void unsaveWord(item.savedWord);
              }}
              onSignIn={openAuthModal}
              onChangeSort={changeSort}
              onResetFilters={resetFilters}
              onRetry={() => void library.refetch()}
              onGoToDiscovery={() => changeView("discovery")}
            />

            <DetailAside
              open={showDetailPanel}
              drillActive={drill.active}
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
                  if (selectedName) void dictionaryQuery.refetch();
                  else if (selectedSavedId) void savedDetailQuery.refetch();
                },
              }}
              drill={{
                current: drill.current,
                index: drill.index,
                total: drill.total,
                flipped: drill.flipped,
                complete: drill.complete,
                loading: drill.loading,
                onFlip: drill.flip,
                onAnswer: (result) => void drill.answer(result),
                onClose: drill.close,
              }}
              launcher={{
                visible: showDrillLauncher,
                loading: drill.loading,
                count: drillIds.length,
                onStart: () => void drill.start(drillIds),
              }}
            />
          </div>

          {/*<AppFooter />*/}
        </div>
      </div>

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
