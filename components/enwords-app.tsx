"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Flame, LogIn, LogOut, Search, UserRound } from "lucide-react";
import type { DictionaryEntry, SavedWord } from "@/lib/types";
import { WordDetail } from "@/components/word-detail";
import { authClient } from "@/lib/auth-client";

type Tab = "words" | "remembered" | "random";
type ApiEnvelope<T> = {
  data: T;
  error?: string;
  alreadySaved?: boolean;
  currentStreak?: number;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong.");
  return payload;
}

function primaryDefinition(word: DictionaryEntry | SavedWord) {
  return word.meanings[0]?.definitions[0]?.definition;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const ui = {
  eyebrow: "mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted",
  panelTitle: "m-0 font-[var(--font-geist-mono)] text-[clamp(1.3rem,2.4vw,1.75rem)] font-bold tracking-[-0.075em]",
  intro: "mb-5 mt-2 max-w-[620px] leading-[1.5] text-muted",
  input: "w-full min-w-0 rounded-[6px] border-2 border-line bg-surface px-3 py-[11px] text-ink placeholder:text-placeholder focus:bg-focus-surface focus:outline-none focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus",
  primaryButton: "inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-line bg-ink px-3.5 py-2.5 font-extrabold text-surface transition hover:-translate-y-0.5 hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus",
  outlineButton: "inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-line bg-surface px-3 py-2.5 font-extrabold transition hover:-translate-y-px hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus",
  emptyState: "rounded-[6px] border-2 border-line bg-panel p-5 leading-[1.55] text-muted",
  authPrompt: "mt-[18px] rounded-[6px] border-2 border-line bg-panel p-5 [&_p]:mb-[14px] [&_p]:mt-0 [&_p]:max-w-[500px] [&_p]:leading-[1.55] [&_p]:text-muted",
};

export function EnWordsApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [tab, setTab] = useState<Tab>("words");
  const [query, setQuery] = useState("");
  const [selectedWordName, setSelectedWordName] = useState<string | null>(null);
  const [selectedSavedWord, setSelectedSavedWord] = useState<SavedWord | null>(
    null,
  );
  const [rememberedQuery, setRememberedQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(5);
  const [reviewQueue, setReviewQueue] = useState<SavedWord[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [meaningVisible, setMeaningVisible] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  const trimmedQuery = query.trim();
  const signedIn = Boolean(session?.user);
  const currentReview = reviewQueue[reviewIndex] ?? null;

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
    queryKey: ["dictionary-word", selectedWordName],
    enabled: Boolean(selectedWordName),
    queryFn: ({ signal }) =>
      request<ApiEnvelope<DictionaryEntry[]>>(
        `/api/dictionary/${encodeURIComponent(selectedWordName ?? "")}`,
        { signal },
      ),
    retry: false,
    refetchOnWindowFocus: false,
    select: (response) => response.data[0] ?? null,
    staleTime: 1000 * 60 * 30,
  });

  const savedWords = useMemo(
    () => rememberedWordsQuery.data ?? [],
    [rememberedWordsQuery.data],
  );
  const streak = streakQuery.data ?? 0;
  const selectedWord = selectedSavedWord ?? dictionaryQuery.data ?? null;
  const selectedIsSaved = Boolean(selectedSavedWord);
  const filteredSaved = useMemo(() => {
    const q = rememberedQuery.trim().toLowerCase();
    return q
      ? savedWords.filter((word) => word.word.toLowerCase().includes(q))
      : savedWords;
  }, [rememberedQuery, savedWords]);
  function selectDictionaryWord(word: string) {
    setSelectedSavedWord(null);
    setSelectedWordName(word);
    setNotice(null);
  }

  function selectSavedWord(word: SavedWord) {
    setSelectedWordName(null);
    setSelectedSavedWord(word);
    setNotice(null);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedQuery) selectDictionaryWord(trimmedQuery);
  }

  function goToSignIn() {
    router.push("/auth/sign-in?next=/");
  }

  async function signOut() {
    setActionLoading(true);
    try {
      await authClient.signOut();
      queryClient.removeQueries({ queryKey: ["remembered-words"] });
      queryClient.removeQueries({ queryKey: ["streak"] });
      setTab("words");
      setSelectedSavedWord(null);
      setReviewQueue([]);
      setReviewComplete(false);
      setNotice("Signed out. Your progress remains safely in your account.");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function saveSelected() {
    if (!signedIn) {
      goToSignIn();
      return;
    }
    if (!selectedWord || selectedIsSaved) return;
    setActionLoading(true);
    setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord>>("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedWord.word }),
      });
      setSelectedWordName(null);
      setSelectedSavedWord(response.data);
      setNotice(
        response.alreadySaved
          ? "This word is already in Remembered."
          : "Added to Remembered.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
    } catch (error) {
      setNotice(messageFor(error, "Unable to save this word."));
    } finally {
      setActionLoading(false);
    }
  }

  async function startReview() {
    if (!signedIn) {
      goToSignIn();
      return;
    }
    setActionLoading(true);
    setNotice(null);
    setSelectedSavedWord(null);
    setSelectedWordName(null);
    try {
      const response = await request<ApiEnvelope<SavedWord[]>>(
        `/api/review?count=${reviewCount}`,
      );
      setReviewQueue(response.data);
      setReviewIndex(0);
      setMeaningVisible(false);
      setReviewComplete(false);
      if (response.data.length === 0)
        setNotice("Add some words before starting a review.");
    } catch (error) {
      setNotice(messageFor(error, "Unable to start review."));
    } finally {
      setActionLoading(false);
    }
  }

  async function answerReview(result: "remembered" | "forgotten") {
    if (!currentReview) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await request<ApiEnvelope<SavedWord>>(
        `/api/words/${currentReview.id}/review`,
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
      if (reviewIndex + 1 >= reviewQueue.length) {
        setReviewComplete(true);
        setReviewIndex((index) => index + 1);
        setNotice("Review complete. Nice work.");
      } else {
        setReviewIndex((index) => index + 1);
        setMeaningVisible(false);
      }
    } catch (error) {
      setNotice(messageFor(error, "Unable to record review."));
    } finally {
      setActionLoading(false);
    }
  }

  const activeError =
    tab === "words"
      ? dictionaryQuery.isError
        ? messageFor(dictionaryQuery.error, "Unable to load dictionary detail.")
        : null
      : tab === "remembered" && rememberedWordsQuery.isError
        ? messageFor(
            rememberedWordsQuery.error,
            "Unable to load remembered words.",
          )
        : tab === "random" && rememberedWordsQuery.isError
          ? messageFor(
              rememberedWordsQuery.error,
              "Unable to load remembered words.",
            )
          : null;

  return (
    <motion.main
      className="mx-auto flex h-dvh w-[calc(100%-32px)] max-w-[1160px] flex-col py-[clamp(12px,2.5vh,28px)] max-[780px]:w-[calc(100%-20px)] max-[780px]:pt-2.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <motion.header
        className="flex items-center justify-between gap-5 rounded-t-[6px] border-2 border-b-0 border-line bg-surface px-5 py-[18px] max-[780px]:items-start max-[780px]:p-[17px]"
        initial={{ y: -16 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <h1 className="m-0 font-[var(--font-geist-mono)] text-[clamp(1.4rem,2.7vw,2rem)] font-black leading-[0.9] tracking-[-0.1em]">
          BILLIEN<span className="mt-2 block text-[0.62rem] font-bold leading-[1.2] tracking-[0.14em] text-muted">LEARN ENGLISH, ONE WORD AT A TIME</span>
        </h1>
        <div className="flex min-w-0 items-center gap-2 self-auto max-[780px]:self-end max-[460px]:w-full">
          <div className="flex min-w-0 items-stretch overflow-hidden rounded-[6px] border-2 border-line bg-surface max-[460px]:flex-1">
            <div className="flex items-center gap-2 bg-streak px-3 py-2" title={`${streak} day streak`} aria-label={`${streak} day streak`}>
              <motion.span
                className="inline-flex [&_svg]:fill-coral [&_svg]:stroke-line"
                animate={{ scale: [1, 1.16, 1], rotate: [0, -7, 7, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8 }}
              >
                <Flame size={20} aria-hidden="true" />
              </motion.span>
              <strong className="font-[var(--font-geist-mono)] text-[1rem] tracking-[-0.06em]">{streak}</strong>
            </div>
            {isSessionPending ? null : signedIn ? (
              <div className="flex min-w-0 items-center gap-2 border-l-2 border-line px-3 py-2" title={`Signed in as ${session?.user?.name || "Learner"}`}>
                <UserRound className="shrink-0 text-muted" size={18} aria-hidden="true" />
                <span className="overflow-hidden text-[0.85rem] font-extrabold text-ellipsis whitespace-nowrap">
                  {session?.user?.name || "Learner"}
                </span>
              </div>
            ) : null}
          </div>
          {isSessionPending ? null : signedIn ? (
            <button
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border-2 border-line bg-surface px-3.5 py-2.5 font-extrabold transition hover:-translate-y-px hover:bg-soft focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 max-[460px]:px-[11px]"
              type="button"
              disabled={actionLoading}
              onClick={() => void signOut()}
            >
              <LogOut size={15} />
              Sign out
            </button>
          ) : (
            <Link className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border-2 border-line bg-surface px-3.5 py-2.5 font-extrabold no-underline transition hover:-translate-y-px hover:bg-soft focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus max-[460px]:px-[11px]" href="/auth/sign-in?next=/">
              <LogIn size={15} />
              Sign in
            </Link>
          )}
        </div>
      </motion.header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] overflow-hidden rounded-b-[6px] border-2 border-line bg-surface max-[780px]:grid-cols-1 max-[780px]:grid-rows-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="min-w-0 overflow-y-auto p-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[780px]:p-[18px]">
          <nav className="flex gap-2 border-b-2 border-line pb-[18px] max-[460px]:gap-[5px]" aria-label="Vocabulary areas">
            {(["words", "remembered", "random"] as Tab[]).map((item) => (
              <button
                key={item}
                className={`rounded-[6px] border-2 border-line px-[13px] py-[9px] text-[0.86rem] font-extrabold transition hover:-translate-y-px hover:bg-soft focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus max-[460px]:px-[9px] max-[460px]:py-2 max-[460px]:text-[0.78rem] ${tab === item ? "bg-ink text-surface hover:bg-ink" : "bg-surface text-ink"}`}
                type="button"
                data-active={tab === item}
                onClick={() => {
                  setTab(item);
                  setNotice(null);
                }}
              >
                {item === "words"
                  ? "Words"
                  : item === "remembered"
                    ? "Remembered"
                    : "Random"}
              </button>
            ))}
          </nav>
          <AnimatePresence mode="wait">
            <motion.div
              className="pt-[22px]"
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {activeError && (
                <div className="rounded-[6px] border-2 border-danger bg-danger-soft p-5 leading-[1.55] text-danger" role="alert">
                  <p>{activeError}</p>
                  {dictionaryQuery.isError && (
                    <button
                      className="mt-3 inline-flex items-center justify-center rounded-[6px] border-2 border-current bg-transparent px-3 py-2.5 font-extrabold transition hover:-translate-y-px focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus"
                      type="button"
                      onClick={() => void dictionaryQuery.refetch()}
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
              {notice && (
                <p className="mb-[15px] mt-0 border-l-4 border-line bg-notice px-[11px] py-[9px] text-[0.84rem]" role="status">
                  {notice}
                </p>
              )}

              {tab === "words" && (
                <>
                  <p className={ui.eyebrow}>Word, decoded</p>
                  <h2 className={ui.panelTitle}>Find the word you need.</h2>
                  <p className={ui.intro}>
                    Search for an English word to retrieve its detail directly
                    from Free Dictionary API.
                  </p>
                  <form className="mb-5 flex gap-2 max-[460px]:flex-col" onSubmit={handleSearch}>
                    <input
                      className={ui.input}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search words, e.g. “achieve”"
                      aria-label="Search an English word"
                    />
                    <button
                      className={ui.primaryButton}
                      disabled={!trimmedQuery || dictionaryQuery.isFetching}
                      type="submit"
                    >
                      <Search size={17} />
                      {dictionaryQuery.isFetching ? "Opening" : "Search"}
                    </button>
                  </form>
                  {!selectedWordName && (
                    <div className={ui.emptyState}>
                      Enter one English word, then press Search to open its
                      dictionary detail.
                    </div>
                  )}
                </>
              )}

              {tab === "remembered" && (
                <>
                  <p className={ui.eyebrow}>Your word bank</p>
                  <h2 className={ui.panelTitle}>Words you chose to keep.</h2>
                  {!signedIn ? (
                    <div className={ui.authPrompt}>
                      <p>
                        Sign in to create a private word bank that follows you
                        across devices.
                      </p>
                      <button
                        className={ui.primaryButton}
                        type="button"
                        onClick={goToSignIn}
                      >
                        <LogIn size={17} />
                        Sign in to Remember
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={ui.intro}>
                        Newest first. Select a word for its saved dictionary
                        record and review history.
                      </p>
                      <input
                        className={ui.input}
                        value={rememberedQuery}
                        onChange={(event) =>
                          setRememberedQuery(event.target.value)
                        }
                        placeholder="Search remembered words"
                        aria-label="Search remembered words"
                      />
                      <div className="mb-2.5 mt-6 flex items-baseline justify-between gap-4">
                        <h3 className="m-0 text-[1rem] font-bold">
                          {filteredSaved.length} word
                          {filteredSaved.length === 1 ? "" : "s"}
                        </h3>
                      </div>
                      {rememberedWordsQuery.isLoading ? (
                        <div className="flex min-h-12 items-center justify-center gap-2 text-center text-[0.82rem] text-muted">
                          <span className="size-2 animate-pulse rounded-full bg-ink" />
                          Loading your word bank…
                        </div>
                      ) : savedWords.length === 0 ? (
                        <div className={ui.emptyState}>
                          No remembered words yet.
                          <br />
                          Add a word from the Words tab first.
                        </div>
                      ) : filteredSaved.length === 0 ? (
                        <div className={ui.emptyState}>
                          No saved words match this search.
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {filteredSaved.map((word) => (
                            <button
                              className="w-full rounded-[6px] border-2 border-line bg-surface px-3.5 py-3 text-left transition hover:translate-x-0.5 hover:bg-hover focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus"
                              type="button"
                              key={word.id}
                              onClick={() => selectSavedWord(word)}
                            >
                              <strong className="block text-[1.05rem]">{word.word}</strong>
                              <span className="mt-[5px] block text-[0.78rem] text-muted">
                                Added {dateLabel(word.added_at)} ·{" "}
                                {word.review_count} reviews
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {tab === "random" && (
                <>
                  <p className={ui.eyebrow}>Flip &amp; recall</p>
                  <h2 className={ui.panelTitle}>Can you remember it?</h2>
                  {!signedIn ? (
                    <div className={ui.authPrompt}>
                      <p>
                        Your random flip queue and every review result belong to
                        your account.
                      </p>
                      <button
                        className={ui.primaryButton}
                        type="button"
                        onClick={goToSignIn}
                      >
                        <LogIn size={17} />
                        Sign in to Flip
                      </button>
                    </div>
                  ) : (
                    <>
                      {!currentReview && !reviewComplete && (
                        <>
                          <p className={ui.intro}>
                            Pull a simple random set from your remembered words.
                            The meaning stays hidden until you flip it.
                          </p>
                          <p className={ui.eyebrow}>How many words?</p>
                          <div className="mb-4 mt-3 flex gap-2">
                            {[5, 10, 20].map((count) => (
                              <button
                                key={count}
                                type="button"
                                className={`min-w-12 rounded-[6px] border-2 border-line px-2.5 py-2.5 font-extrabold transition hover:-translate-y-px hover:bg-soft focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus ${reviewCount === count ? "bg-ink text-surface hover:bg-ink" : "bg-surface"}`}
                                data-selected={reviewCount === count}
                                onClick={() => setReviewCount(count)}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                          <button
                            className={ui.primaryButton}
                            type="button"
                            disabled={actionLoading || savedWords.length === 0}
                            onClick={() => void startReview()}
                          >
                            <Brain size={17} />
                            Start Review
                          </button>
                          {savedWords.length === 0 && (
                            <p className={ui.intro}>
                              Add some words before starting a review.
                            </p>
                          )}
                        </>
                      )}
                      {currentReview && (
                        <motion.article
                          className="rounded-[6px] border-2 border-line bg-surface p-5"
                          key={`${currentReview.id}-${meaningVisible}`}
                          initial={{ opacity: 0, rotateX: -14, y: 12 }}
                          animate={{ opacity: 1, rotateX: 0, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 270,
                            damping: 22,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 text-[0.78rem] text-muted">
                            <span className={ui.eyebrow}>
                              Word {reviewIndex + 1} / {reviewQueue.length}
                            </span>
                            <span>
                              {meaningVisible
                                ? "Meaning shown"
                                : "Meaning hidden"}
                            </span>
                          </div>
                          <h3 className="my-5 break-words font-[var(--font-geist-mono)] text-[clamp(2rem,5.8vw,4rem)] tracking-[-0.1em]">{currentReview.word}</h3>
                          {meaningVisible ? (
                            <>
                              <p className="mb-[18px] border-l-[5px] border-line py-[3px] pl-[13px] leading-[1.5]">
                                {primaryDefinition(currentReview) ??
                                  "No primary definition was saved."}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-danger bg-danger px-3.5 py-2.5 font-extrabold text-surface transition hover:-translate-y-0.5 hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus"
                                  disabled={actionLoading}
                                  type="button"
                                  onClick={() => void answerReview("forgotten")}
                                >
                                  Forgot
                                </button>
                                <button
                                  className="inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-success bg-success px-3.5 py-2.5 font-extrabold text-surface transition hover:-translate-y-0.5 hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus"
                                  disabled={actionLoading}
                                  type="button"
                                  onClick={() =>
                                    void answerReview("remembered")
                                  }
                                >
                                  Remember
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={`${ui.primaryButton} w-full`}
                                type="button"
                                onClick={() => setMeaningVisible(true)}
                              >
                                Show meaning
                              </button>
                            </div>
                          )}
                        </motion.article>
                      )}
                      {reviewComplete && (
                        <div className={ui.emptyState}>
                          <strong>Review complete.</strong>
                          <br />
                          You can start another random round whenever you are
                          ready.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
        <aside className="min-w-0 overflow-y-auto border-l-2 border-line bg-detail p-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[780px]:border-l-0 max-[780px]:border-t-2 max-[780px]:p-[18px]">
          <WordDetail
            word={tab === "random" ? null : selectedWord}
            isLoading={Boolean(selectedWordName && dictionaryQuery.isLoading)}
            errorMessage={
              tab === "words" && dictionaryQuery.isError
                ? messageFor(
                    dictionaryQuery.error,
                    "Unable to load dictionary detail.",
                  )
                : null
            }
            onRemember={
              signedIn && selectedWord && !selectedIsSaved
                ? () => void saveSelected()
                : undefined
            }
            onSignIn={!signedIn ? goToSignIn : undefined}
            isSaving={actionLoading}
          />
        </aside>
      </div>
    </motion.main>
  );
}
