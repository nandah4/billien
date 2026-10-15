"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  LogIn,
  LogOut,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type {
  DictionaryEntry,
  DictionaryMeaning,
  SavedWord,
} from "@/lib/types";
import { DISCOVERY_WORDS } from "@/lib/discovery";
import { WordDetail } from "@/components/word-detail";
import { authClient } from "@/lib/auth-client";

type ApiEnvelope<T> = {
  data: T;
  error?: string;
  alreadySaved?: boolean;
  currentStreak?: number;
};

type PosBucket = "noun" | "verb" | "adjective" | "other";
type FilterId = "all" | PosBucket | "saved";

type LibraryWord = {
  key: string;
  word: string;
  phonetic: string | null;
  meanings: DictionaryMeaning[];
  savedWord: SavedWord | null;
};

const PAGE_SIZE = 8;
const DRILL_SIZE = 5;

const cardClass = "rounded-xl border border-line bg-surface shadow-sm";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong.");
  return payload;
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function posBucket(partOfSpeech?: string): PosBucket {
  const value = (partOfSpeech ?? "").toLowerCase();
  if (value.startsWith("noun")) return "noun";
  if (value.startsWith("verb")) return "verb";
  if (value.startsWith("adjective")) return "adjective";
  return "other";
}

function primaryDefinition(word: { meanings?: DictionaryMeaning[] }) {
  return word.meanings?.[0]?.definitions?.[0]?.definition?.trim() ?? null;
}

function dictionaryOptions(word: string) {
  return {
    queryKey: ["dictionary-word", word],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<ApiEnvelope<DictionaryEntry[]>>(
        `/api/dictionary/${encodeURIComponent(word)}`,
        { signal },
      ),
    retry: false,
    staleTime: 1000 * 60 * 30,
    select: (response: ApiEnvelope<DictionaryEntry[]>) =>
      response.data[0] ?? null,
  };
}

export function EnWordsApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(1);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedSavedWord, setSelectedSavedWord] = useState<SavedWord | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [drillActive, setDrillActive] = useState(false);
  const [drillQueue, setDrillQueue] = useState<SavedWord[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillFlipped, setDrillFlipped] = useState(false);
  const [drillComplete, setDrillComplete] = useState(false);

  const signedIn = Boolean(session?.user);
  const sessionLabel = signedIn
    ? session?.user?.name || "Learner"
    : "Guest session";

  const rememberedWordsQuery = useQuery({
    queryKey: ["remembered-words"],
    enabled: signedIn,
    queryFn: ({ signal }) =>
      request<ApiEnvelope<SavedWord[]>>("/api/words", { signal }),
    select: (response) => response.data,
  });
  const streakQuery = useQuery({
    queryKey: ["streak"],
    enabled: signedIn,
    queryFn: ({ signal }) =>
      request<ApiEnvelope<unknown[]>>("/api/streak", { signal }),
    select: (response) => response.currentStreak ?? 0,
  });
  const dictionaryQuery = useQuery({
    ...dictionaryOptions(selectedName ?? ""),
    enabled: Boolean(selectedName),
  });

  const savedWords = useMemo(
    () => rememberedWordsQuery.data ?? [],
    [rememberedWordsQuery.data],
  );
  const streak = streakQuery.data ?? 0;
  const savedByKey = useMemo(
    () => new Map(savedWords.map((word) => [word.normalized_word, word])),
    [savedWords],
  );
  // Curated seed words keep the list useful before an account has saved anything.
  const seedWords = useMemo(
    () => DISCOVERY_WORDS.filter((word) => !savedByKey.has(word)),
    [savedByKey],
  );
  const seedQueries = useQueries({
    queries: seedWords.map((word) => dictionaryOptions(word)),
  });

  const library: LibraryWord[] = [
    ...savedWords.map((word) => ({
      key: word.normalized_word,
      word: word.word,
      phonetic: word.phonetic,
      meanings: word.meanings ?? [],
      savedWord: word,
    })),
    ...seedWords.map((word, index) => {
      const entry = seedQueries[index]?.data ?? null;
      return {
        key: word,
        word: entry?.word ?? word,
        phonetic: entry?.phonetic ?? null,
        meanings: entry?.meanings ?? [],
        savedWord: null,
      };
    }),
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const posCounts: Record<PosBucket, number> = {
    noun: 0,
    verb: 0,
    adjective: 0,
    other: 0,
  };
  for (const item of library) {
    posCounts[posBucket(item.meanings[0]?.partOfSpeech)] += 1;
  }

  const filteredLibrary = library.filter((item) => {
    if (normalizedQuery && !item.word.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (filter === "saved") return Boolean(item.savedWord);
    if (filter === "all") return true;
    return posBucket(item.meanings[0]?.partOfSpeech) === filter;
  });

  const pageCount = Math.max(1, Math.ceil(filteredLibrary.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredLibrary.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const filters: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: "All", count: library.length },
    { id: "verb", label: "Verbs", count: posCounts.verb },
    { id: "adjective", label: "Adjectives", count: posCounts.adjective },
    { id: "noun", label: "Nouns", count: posCounts.noun },
    { id: "saved", label: "Sudah Dihafal", count: savedWords.length },
  ];

  const detailWord = selectedSavedWord ?? dictionaryQuery.data ?? null;
  const currentDrill = drillQueue[drillIndex] ?? null;
  const activeError = rememberedWordsQuery.isError
    ? messageFor(
        rememberedWordsQuery.error,
        "Unable to load your memorised words.",
      )
    : null;
  const isListLoading =
    isSessionPending || (signedIn && rememberedWordsQuery.isLoading);

  function selectLibraryWord(item: LibraryWord) {
    setNotice(null);
    if (item.savedWord) {
      setSelectedSavedWord(item.savedWord);
      setSelectedName(null);
      return;
    }
    setSelectedSavedWord(null);
    setSelectedName(item.key);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const word = query.trim().toLowerCase();
    if (!/^[a-z][a-z'-]*$/i.test(word)) {
      setNotice("Enter one valid English word to look it up.");
      return;
    }
    setSelectedSavedWord(null);
    setSelectedName(word);
    setNotice(null);
  }

  function focusSearch() {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }

  function goToSignIn() {
    router.push("/auth/sign-in?next=/");
  }

  function closeDrill() {
    setDrillActive(false);
    setDrillQueue([]);
    setDrillIndex(0);
    setDrillFlipped(false);
    setDrillComplete(false);
  }

  async function signOut() {
    setActionLoading(true);
    try {
      await authClient.signOut();
      queryClient.removeQueries({ queryKey: ["remembered-words"] });
      queryClient.removeQueries({ queryKey: ["streak"] });
      closeDrill();
      setSelectedSavedWord(null);
      setSelectedName(null);
      setNotice("Signed out. Your progress remains safely in your account.");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function saveWord(name: string) {
    if (!signedIn) {
      goToSignIn();
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
    }
  }

  async function startDrill() {
    if (!signedIn) {
      goToSignIn();
      return;
    }
    setActionLoading(true);
    setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord[]>>(
        `/api/review?count=${DRILL_SIZE}`,
      );
      if (response.data.length === 0) {
        setNotice("Add some words before starting a drill.");
        return;
      }
      setDrillQueue(response.data);
      setDrillIndex(0);
      setDrillFlipped(false);
      setDrillComplete(false);
      setDrillActive(true);
    } catch (error) {
      setNotice(messageFor(error, "Unable to start the drill."));
    } finally {
      setActionLoading(false);
    }
  }

  async function answerDrill(result: "remembered" | "forgotten") {
    if (!currentDrill) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await request<ApiEnvelope<SavedWord>>(
        `/api/words/${currentDrill.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result }),
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      if (drillIndex + 1 >= drillQueue.length) {
        setDrillComplete(true);
        setDrillIndex((index) => index + 1);
      } else {
        setDrillIndex((index) => index + 1);
        setDrillFlipped(false);
      }
    } catch (error) {
      setNotice(messageFor(error, "Unable to record the review."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-310 flex-col gap-4">
        <header
          className={`${cardClass} flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <span
                className="size-2 rounded-full bg-accent"
                aria-hidden="true"
              />
              Billien
            </span>
            <span
              className="hidden h-4 w-px bg-line lg:block"
              aria-hidden="true"
            />
            <span className="truncate text-[12px] text-muted">
              Active Session: {sessionLabel}
            </span>
            {signedIn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-medium-soft px-2.5 py-1 text-[11px] font-semibold text-medium">
                <Flame size={12} aria-hidden="true" />
                {streak} day streak
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={primaryButton}
              type="button"
              onClick={focusSearch}
            >
              <Plus size={15} aria-hidden="true" />
              Add Custom Word
            </button>
            {isSessionPending ? null : signedIn ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 text-[12px] font-semibold text-ink">
                  <UserRound
                    size={15}
                    className="text-faint"
                    aria-hidden="true"
                  />
                  <span className="max-w-35 truncate">{sessionLabel}</span>
                </span>
                <button
                  className={outlineButton}
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link className={outlineButton} href="/auth/sign-in?next=/">
                <LogIn size={15} aria-hidden="true" />
                Sign in
              </Link>
            )}
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className={cardClass}>
            <div className="border-b border-line p-4">
              <form
                className="flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 transition focus-within:border-accent focus-within:bg-surface"
                onSubmit={handleSearchSubmit}
                role="search"
              >
                <Search
                  size={16}
                  className="shrink-0 text-faint"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-placeholder"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search an English word…"
                  aria-label="Search an English word"
                />
                {normalizedQuery ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                    Filter: &ldquo;{query.trim()}&rdquo;
                    <button
                      className="inline-flex items-center justify-center rounded-full transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setPage(1);
                      }}
                      aria-label="Clear the search filter"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filters.map((item) => {
                  const active = filter === item.id;
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
                      onClick={() => {
                        setFilter(item.id);
                        setPage(1);
                      }}
                    >
                      {item.label}
                      <span
                        className={active ? "text-surface/70" : "text-faint"}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4">
              {activeError ? (
                <p
                  className="mb-3 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2 text-[12px] text-hard"
                  role="alert"
                >
                  {activeError}
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

              {isListLoading && library.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted">
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                  Loading your word library…
                </div>
              ) : pageItems.length === 0 ? (
                <div className="rounded-xl border border-line bg-subtle px-4 py-10 text-center text-[12px] text-muted">
                  No words match this view yet.
                  <br />
                  Type a word above and press Enter to look it up.
                </div>
              ) : (
                <ul className="grid list-none gap-2 p-0">
                  {pageItems.map((item) => {
                    const active =
                      selectedSavedWord?.normalized_word === item.key ||
                      (!selectedSavedWord && selectedName === item.key);
                    const part = item.meanings[0]?.partOfSpeech;
                    const definition = primaryDefinition(item);
                    return (
                      <li key={item.key}>
                        <div
                          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                            active
                              ? "border-accent bg-accent-soft"
                              : "border-line bg-surface hover:bg-hover"
                          }`}
                        >
                          <button
                            className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            type="button"
                            onClick={() => selectLibraryWord(item)}
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-semibold text-ink">
                                {item.word}
                              </span>
                              {item.phonetic ? (
                                <span className="text-[12px] text-muted italic">
                                  {item.phonetic}
                                </span>
                              ) : null}
                              {part ? (
                                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-accent-line ring-inset">
                                  {capitalize(part)}
                                </span>
                              ) : null}
                            </span>
                            {definition ? (
                              <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-muted">
                                {definition}
                              </span>
                            ) : null}
                          </button>

                          {item.savedWord ? (
                            <span
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-easy-soft text-easy"
                              title="Sudah dihafal"
                            >
                              <Check size={16} aria-hidden="true" />
                            </span>
                          ) : (
                            <button
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                              type="button"
                              disabled={savingKey === item.key}
                              onClick={() => void saveWord(item.word)}
                              title={`Tandai "${item.word}" sudah hafal`}
                              aria-label={`Tandai ${item.word} sudah hafal`}
                            >
                              <Plus size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-muted">
                Showing <strong className="text-ink">{pageItems.length}</strong>{" "}
                of{" "}
                <strong className="text-ink">{filteredLibrary.length}</strong>{" "}
                words
                {savedWords.length > 0 ? (
                  <>
                    {" · "}
                    <span className="font-semibold text-easy">
                      {savedWords.length} memorised
                    </span>
                  </>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </button>
                <span className="text-[12px] text-muted">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className={`${cardClass} p-4`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={drillActive ? "drill" : (detailWord?.word ?? "empty")}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {drillActive ? (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                          <Brain
                            size={16}
                            className="text-accent"
                            aria-hidden="true"
                          />
                          Drill Hafalan
                        </span>
                        <button
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          type="button"
                          onClick={closeDrill}
                          aria-label="Close the drill"
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>

                      {drillComplete ? (
                        <div className="mt-4 rounded-xl border border-line bg-subtle p-4 text-[13px] text-muted">
                          <strong className="block text-ink">
                            Drill complete.
                          </strong>
                          You can start another round whenever you are ready.
                        </div>
                      ) : currentDrill ? (
                        <>
                          <p className="mt-4 text-[11px] font-semibold tracking-wider text-faint uppercase">
                            Word {drillIndex + 1} / {drillQueue.length}
                          </p>
                          <h3 className="mt-2 text-[30px] leading-tight font-bold tracking-[-0.02em] wrap-anywhere">
                            {currentDrill.word}
                          </h3>
                          {drillFlipped ? (
                            <>
                              <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-ink-soft italic">
                                {primaryDefinition(currentDrill) ??
                                  "No primary definition was saved."}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-hard px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => void answerDrill("forgotten")}
                                >
                                  Lupa
                                </button>
                                <button
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-easy px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => void answerDrill("remembered")}
                                >
                                  Ingat
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              className={`${primaryButton} mt-4 w-full`}
                              type="button"
                              onClick={() => setDrillFlipped(true)}
                            >
                              Show meaning
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <WordDetail
                      word={detailWord}
                      isLoading={Boolean(
                        selectedName && dictionaryQuery.isLoading,
                      )}
                      errorMessage={
                        selectedName && dictionaryQuery.isError
                          ? messageFor(
                              dictionaryQuery.error,
                              "Unable to load dictionary detail.",
                            )
                          : null
                      }
                      isSaving={Boolean(
                        detailWord && savingKey === detailWord.word,
                      )}
                      onSave={
                        signedIn && detailWord && !isSavedWord(detailWord)
                          ? () => void saveSelected()
                          : undefined
                      }
                      onSignIn={!signedIn ? goToSignIn : undefined}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {!drillActive ? (
              <div className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Sparkles size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">
                        Uji Pemahaman Kata Ini
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        Latihan kalimat rumpang &amp; flashcard instan
                      </p>
                    </div>
                  </div>
                  <button
                    className={outlineButton}
                    type="button"
                    disabled={actionLoading || !signedIn}
                    onClick={() => void startDrill()}
                  >
                    Start Drill
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <footer
          className={`${cardClass} flex flex-col gap-2 px-4 py-3 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="m-0">
            <span className="font-semibold text-ink">Billien</span> · Lexical
            Mastery Platform
          </p>
          <p className="m-0">
            © 2025 Billien. Focused cognitive language acquisition and lexical
            tracking.
          </p>
          <p className="m-0">
            Definitions by{" "}
            <a
              className="font-medium text-accent underline decoration-accent-line hover:decoration-accent"
              href="https://dictionaryapi.dev"
              target="_blank"
              rel="noreferrer"
            >
              Free Dictionary API
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function isSavedWord(word: SavedWord | DictionaryEntry): word is SavedWord {
  return "id" in word;
}
