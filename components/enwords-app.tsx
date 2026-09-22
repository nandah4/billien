"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Flame, LogIn, LogOut, Search } from "lucide-react";
import type { DictionaryEntry, SavedWord } from "@/lib/types";
import { WordDetail } from "@/components/word-detail";
import { authClient } from "@/lib/auth-client";

type Tab = "words" | "remembered" | "random";
type ApiEnvelope<T> = { data: T; error?: string; alreadySaved?: boolean; currentStreak?: number };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong.");
  return payload;
}

function primaryDefinition(word: DictionaryEntry | SavedWord) {
  return word.meanings[0]?.definitions[0]?.definition;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EnWordsApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [tab, setTab] = useState<Tab>("words");
  const [query, setQuery] = useState("");
  const [selectedWordName, setSelectedWordName] = useState<string | null>(null);
  const [selectedSavedWord, setSelectedSavedWord] = useState<SavedWord | null>(null);
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
    queryFn: ({ signal }) => request<ApiEnvelope<SavedWord[]>>("/api/words", { signal }),
    select: (response) => response.data,
  });
  const streakQuery = useQuery({
    queryKey: ["streak"],
    enabled: signedIn,
    queryFn: ({ signal }) => request<ApiEnvelope<unknown[]>>("/api/streak", { signal }),
    select: (response) => response.currentStreak ?? 0,
  });
  const dictionaryQuery = useQuery({
    queryKey: ["dictionary-word", selectedWordName],
    enabled: Boolean(selectedWordName),
    queryFn: ({ signal }) => request<ApiEnvelope<DictionaryEntry[]>>(
      `/api/dictionary/${encodeURIComponent(selectedWordName ?? "")}`,
      { signal },
    ),
    retry: false,
    refetchOnWindowFocus: false,
    select: (response) => response.data[0] ?? null,
    staleTime: 1000 * 60 * 30,
  });

  const savedWords = useMemo(() => rememberedWordsQuery.data ?? [], [rememberedWordsQuery.data]);
  const streak = streakQuery.data ?? 0;
  const selectedWord = selectedSavedWord ?? dictionaryQuery.data ?? null;
  const selectedIsSaved = Boolean(selectedSavedWord);
  const filteredSaved = useMemo(() => {
    const q = rememberedQuery.trim().toLowerCase();
    return q ? savedWords.filter((word) => word.word.toLowerCase().includes(q)) : savedWords;
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
      setTab("words"); setSelectedSavedWord(null); setReviewQueue([]); setReviewComplete(false);
      setNotice("Signed out. Your progress remains safely in your account.");
      router.refresh();
    } finally { setActionLoading(false); }
  }

  async function saveSelected() {
    if (!signedIn) { goToSignIn(); return; }
    if (!selectedWord || selectedIsSaved) return;
    setActionLoading(true); setNotice(null);
    try {
      const response = await request<ApiEnvelope<SavedWord>>("/api/words", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedWord.word }),
      });
      setSelectedWordName(null);
      setSelectedSavedWord(response.data);
      setNotice(response.alreadySaved ? "This word is already in Remembered." : "Added to Remembered.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
    } catch (error) {
      setNotice(messageFor(error, "Unable to save this word."));
    } finally { setActionLoading(false); }
  }

  async function startReview() {
    if (!signedIn) { goToSignIn(); return; }
    setActionLoading(true); setNotice(null); setSelectedSavedWord(null); setSelectedWordName(null);
    try {
      const response = await request<ApiEnvelope<SavedWord[]>>(`/api/review?count=${reviewCount}`);
      setReviewQueue(response.data); setReviewIndex(0); setMeaningVisible(false); setReviewComplete(false);
      if (response.data.length === 0) setNotice("Add some words before starting a review.");
    } catch (error) {
      setNotice(messageFor(error, "Unable to start review."));
    } finally { setActionLoading(false); }
  }

  async function answerReview(result: "remembered" | "forgotten") {
    if (!currentReview) return;
    setActionLoading(true); setNotice(null);
    try {
      await request<ApiEnvelope<SavedWord>>(`/api/words/${currentReview.id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["remembered-words"] }),
        queryClient.invalidateQueries({ queryKey: ["streak"] }),
      ]);
      if (reviewIndex + 1 >= reviewQueue.length) {
        setReviewComplete(true); setReviewIndex((index) => index + 1); setNotice("Review complete. Nice work.");
      } else { setReviewIndex((index) => index + 1); setMeaningVisible(false); }
    } catch (error) {
      setNotice(messageFor(error, "Unable to record review."));
    } finally { setActionLoading(false); }
  }

  const activeError = tab === "words"
    ? (dictionaryQuery.isError ? messageFor(dictionaryQuery.error, "Unable to load dictionary detail.") : null)
    : tab === "remembered" && rememberedWordsQuery.isError ? messageFor(rememberedWordsQuery.error, "Unable to load remembered words.")
      : tab === "random" && rememberedWordsQuery.isError ? messageFor(rememberedWordsQuery.error, "Unable to load remembered words.") : null;

  return <motion.main className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
    <motion.header className="app-header" initial={{ y: -16 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}><h1 className="brand">BILLIEN<span>LEARN ENGLISH, ONE WORD AT A TIME</span></h1>
      <div className="header-actions"><div className="streak"><motion.span className="flame-motion" animate={{ scale: [1, 1.16, 1], rotate: [0, -7, 7, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8 }}><Flame size={21} aria-hidden="true" /></motion.span><span className="streak-copy"><strong>{streak}</strong><span>day streak</span></span></div>{isSessionPending ? null : signedIn ? <div className="account-actions"><div className="account-identity"><span className="account-label">Studying as</span><span className="account-name">{session?.user?.name || "Learner"}</span></div><button className="outline-button" type="button" disabled={actionLoading} onClick={() => void signOut()}><LogOut size={15} />Sign out</button></div> : <Link className="outline-button sign-in-link" href="/auth/sign-in?next=/"><LogIn size={15} />Sign in</Link>}</div>
    </motion.header>
    <div className="app-grid"><section className="main-column">
      <nav className="tabs" aria-label="Vocabulary areas">
        {(["words", "remembered", "random"] as Tab[]).map((item) => <button key={item} className="tab-button" type="button" data-active={tab === item} onClick={() => { setTab(item); setNotice(null); }}>
          {item === "words" ? "Words" : item === "remembered" ? "Remembered" : "Random"}
        </button>)}
      </nav>
      <AnimatePresence mode="wait"><motion.div className="panel" key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
        {activeError && <div className="error-state" role="alert"><p>{activeError}</p>{dictionaryQuery.isError && <button className="outline-button" type="button" onClick={() => void dictionaryQuery.refetch()}>Try again</button>}</div>}
        {notice && <p className="notice" role="status">{notice}</p>}

        {tab === "words" && <>
          <p className="eyebrow">Dictionary search</p><h2 className="panel-title">Find the word you need.</h2>
          <p className="panel-intro">Search for an English word to retrieve its detail directly from Free Dictionary API.</p>
          <form className="search-form" onSubmit={handleSearch}>
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words, e.g. “achieve”" aria-label="Search an English word" />
            <button className="primary-button" disabled={!trimmedQuery || dictionaryQuery.isFetching} type="submit"><Search size={17} />{dictionaryQuery.isFetching ? "Opening" : "Search"}</button>
          </form>
          {!selectedWordName && <div className="empty-state">Enter one English word, then press Search to open its dictionary detail.</div>}
        </>}

        {tab === "remembered" && <>
          <p className="eyebrow">Your word bank</p><h2 className="panel-title">Words you chose to keep.</h2>
          {!signedIn ? <div className="auth-prompt"><p>Sign in to create a private word bank that follows you across devices.</p><button className="primary-button" type="button" onClick={goToSignIn}><LogIn size={17} />Sign in to Remember</button></div> : <><p className="panel-intro">Newest first. Select a word for its saved dictionary record and review history.</p>
          <input className="input" value={rememberedQuery} onChange={(event) => setRememberedQuery(event.target.value)} placeholder="Search remembered words" aria-label="Search remembered words" />
          <div className="section-heading"><h3>{filteredSaved.length} word{filteredSaved.length === 1 ? "" : "s"}</h3></div>
          {rememberedWordsQuery.isLoading ? <div className="discovery-status"><span className="loading-dot" />Loading your word bank…</div> : savedWords.length === 0 ? <div className="empty-state">No remembered words yet.<br />Add a word from the Words tab first.</div> : filteredSaved.length === 0 ? <div className="empty-state">No saved words match this search.</div> : <div className="saved-list">{filteredSaved.map((word) => <button className="saved-item" type="button" key={word.id} onClick={() => selectSavedWord(word)}><strong>{word.word}</strong><span>Added {dateLabel(word.added_at)} · {word.review_count} reviews</span></button>)}</div>}</>}
        </>}

        {tab === "random" && <>
          <p className="eyebrow">Flip &amp; recall</p><h2 className="panel-title">Can you remember it?</h2>
          {!signedIn ? <div className="auth-prompt"><p>Your random flip queue and every review result belong to your account.</p><button className="primary-button" type="button" onClick={goToSignIn}><LogIn size={17} />Sign in to Flip</button></div> : <>{!currentReview && !reviewComplete && <><p className="panel-intro">Pull a simple random set from your remembered words. The meaning stays hidden until you flip it.</p><p className="eyebrow">How many words?</p><div className="count-options">{[5, 10, 20].map((count) => <button key={count} type="button" className="select-count" data-selected={reviewCount === count} onClick={() => setReviewCount(count)}>{count}</button>)}</div><button className="primary-button" type="button" disabled={actionLoading || savedWords.length === 0} onClick={() => void startReview()}><Brain size={17} />Start Review</button>{savedWords.length === 0 && <p className="panel-intro">Add some words before starting a review.</p>}</>}
          {currentReview && <motion.article className="review-card" key={`${currentReview.id}-${meaningVisible}`} initial={{ opacity: 0, rotateX: -14, y: 12 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ type: "spring", stiffness: 270, damping: 22 }}><div className="review-status"><span className="eyebrow">Word {reviewIndex + 1} / {reviewQueue.length}</span><span>{meaningVisible ? "Meaning shown" : "Meaning hidden"}</span></div><h3 className="review-word">{currentReview.word}</h3>
            {meaningVisible ? <><p className="review-definition">{primaryDefinition(currentReview) ?? "No primary definition was saved."}</p><div className="review-actions"><button className="danger-button" disabled={actionLoading} type="button" onClick={() => void answerReview("forgotten")}>Forgot</button><button className="success-button" disabled={actionLoading} type="button" onClick={() => void answerReview("remembered")}>Remember</button></div></> : <div className="review-actions"><button className="primary-button" type="button" onClick={() => setMeaningVisible(true)}>Show meaning</button></div>}
          </motion.article>}
          {reviewComplete && <div className="empty-state"><strong>Review complete.</strong><br />You can start another random round whenever you are ready.</div>}</>}
        </>}
      </motion.div></AnimatePresence>
    </section><aside className="detail-column"><WordDetail word={tab === "random" ? null : selectedWord} isLoading={Boolean(selectedWordName && dictionaryQuery.isLoading)} errorMessage={tab === "words" && dictionaryQuery.isError ? messageFor(dictionaryQuery.error, "Unable to load dictionary detail.") : null} onRemember={signedIn && selectedWord && !selectedIsSaved ? () => void saveSelected() : undefined} onSignIn={!signedIn ? goToSignIn : undefined} isSaving={actionLoading} /></aside></div>
  </motion.main>;
}
