"use client";

import { BookmarkPlus, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DictionaryEntry, DictionaryMeaning, SavedWord } from "@/lib/types";

type DetailWord = DictionaryEntry | SavedWord;

function audioUrl(word: DetailWord | null) {
  const url = word?.phonetics?.map((item) => item.audio?.trim()).find(Boolean);
  if (!url) return null;
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  try {
    const parsed = new URL(normalized);
    const isAllowed = parsed.protocol === "https:" && (
      (parsed.hostname === "ssl.gstatic.com" && parsed.pathname.startsWith("/dictionary/static/sounds/")) ||
      (parsed.hostname === "api.dictionaryapi.dev" && parsed.pathname.startsWith("/media/pronunciations/"))
    );
    if (!isAllowed) return null;
    const asset = btoa(parsed.toString())
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    return `/api/asset?asset=${asset}`;
  } catch {
    return null;
  }
}

function isSavedWord(word: DetailWord): word is SavedWord {
  return "id" in word;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function Meaning({ meaning }: { meaning: DictionaryMeaning }) {
  const tags = [...(meaning.synonyms ?? []), ...(meaning.antonyms ?? [])].slice(0, 8);
  return <div className="mt-[15px] first:mt-0">
    <span className="inline-block border-b-2 border-line pb-0.5 text-[0.84rem] italic">{meaning.partOfSpeech}</span>
    <ol className="mb-0 mt-[9px] pl-[18px]">
      {meaning.definitions.slice(0, 3).map((definition, index) => <li key={`${definition.definition}-${index}`}>
        {definition.definition}
        {definition.example && <em className="mt-1 block text-muted">“{definition.example}”</em>}
      </li>)}
    </ol>
    {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tags.map((tag) => <span className="rounded-[4px] border border-line px-[5px] py-0.5 text-[0.68rem]" key={tag}>{tag}</span>)}</div>}
  </div>;
}

export function WordDetail({
  word,
  isLoading = false,
  errorMessage = null,
  isSaving = false,
  onRemember,
  onSignIn,
}: {
  word: DetailWord | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSaving?: boolean;
  onRemember?: () => void;
  onSignIn?: () => void;
}) {
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [audioError, setAudioError] = useState<{ source: string; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audio = audioUrl(word);

  useEffect(() => {
    const player = playerRef.current;
    player?.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    return () => {
      player?.pause();
    };
  }, [audio]);

  async function playPronunciation() {
    const player = playerRef.current;
    if (!player || !audio) return;

    setAudioError(null);
    setIsPlaying(true);

    try {
      const response = await fetch(audio);
      const payload = await response.json() as { audio?: string };
      if (!response.ok || !payload.audio) throw new Error("Audio asset unavailable.");

      const binary = atob(payload.audio);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));

      player.pause();
      player.src = objectUrlRef.current;
      player.currentTime = 0;
      player.muted = false;
      player.volume = 1;
      await player.play();
    } catch {
      setAudioError({ source: audio, message: "Pronunciation audio could not be played. Please try another word." });
    } finally {
      setIsPlaying(false);
    }
  }

  if (isLoading) return <div className="pt-1.5 leading-[1.5] text-muted">
    <p className="mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted">Dictionary detail</p>
    <p>Loading the selected word…</p>
  </div>;
  if (errorMessage) return <div className="pt-1.5 leading-[1.5] text-muted">
    <p className="mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted">Dictionary detail</p>
    <p className="text-danger">{errorMessage}</p>
  </div>;
  if (!word) return <div className="pt-1.5 leading-[1.5] text-muted">
    <p className="mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted">Word detail</p>
    <p>Select a word to see its meanings, examples, source, and pronunciation when available.</p>
  </div>;

  const sourceUrls = isSavedWord(word) ? word.source_urls : word.sourceUrls ?? [];
  const saved = isSavedWord(word);
  return <article>
    <audio
      ref={playerRef}
      onError={() => audio && setAudioError({ source: audio, message: "Pronunciation audio could not be loaded for this word." })}
    />
    <p className="mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted">{saved ? "Remembered word" : "Dictionary detail"}</p>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="m-0 [overflow-wrap:anywhere] font-[var(--font-geist-mono)] text-[1.7rem] tracking-[-0.08em]">{word.word}</h2>{word.phonetic && <p className="mb-0 mt-[5px] font-[var(--font-geist-mono)] text-[0.8rem] text-muted">{word.phonetic}</p>}</div>
      {audio && <button className="inline-flex size-[37px] items-center justify-center rounded-[6px] border-2 border-line bg-surface transition hover:rotate-[-6deg] hover:bg-ink hover:text-surface focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-50" type="button" disabled={isPlaying} title={`Play pronunciation for ${word.word}`} aria-label={`Play pronunciation for ${word.word}`} onClick={() => void playPronunciation()}><Volume2 size={19} /></button>}
    </div>
    {audioError?.source === audio && <p className="mt-2 text-[0.78rem] text-danger" role="status">{audioError.message}</p>}

    <section className="mt-[19px] border-t border-line-soft pt-[15px]"><h3 className="mb-2.5 mt-0 text-[0.72rem] font-bold uppercase tracking-[0.12em]">Meanings</h3>
      {word.meanings.length > 0 ? word.meanings.map((meaning, index) => <Meaning key={`${meaning.partOfSpeech}-${index}`} meaning={meaning} />) : <p className="pt-1.5 leading-[1.5] text-muted">No meanings were supplied by the dictionary.</p>}
    </section>

    {sourceUrls.length > 0 && <section className="mt-[19px] border-t border-line-soft pt-[15px]"><h3 className="mb-2.5 mt-0 text-[0.72rem] font-bold uppercase tracking-[0.12em]">Source</h3>
      {sourceUrls.map((url) => <p key={url}><a className="[overflow-wrap:anywhere] text-ink underline decoration-2" href={url} target="_blank" rel="noreferrer">{url}</a></p>)}
    </section>}

    {!saved && <section className="mt-[19px] border-t border-line-soft pt-[15px]">{onRemember ? <button className="inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-line bg-ink px-3.5 py-2.5 font-extrabold text-surface transition hover:-translate-y-0.5 hover:bg-ink-hover focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={isSaving} onClick={onRemember}><BookmarkPlus size={17} />{isSaving ? "Saving" : "Add to Remember"}</button> : onSignIn ? <button className="inline-flex items-center justify-center gap-2 rounded-[6px] border-2 border-line bg-surface px-3 py-2.5 font-extrabold transition hover:-translate-y-px hover:bg-soft focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus" type="button" onClick={onSignIn}><BookmarkPlus size={17} />Sign in to Remember</button> : null}</section>}

    {saved && <section className="mt-[19px] border-t border-line-soft pt-[15px]"><h3 className="mb-2.5 mt-0 text-[0.72rem] font-bold uppercase tracking-[0.12em]">Review record</h3><dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[0.78rem] [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-bold [&_dt]:text-muted">
      <dt>Added</dt><dd>{formatDate(word.added_at)}</dd>
      <dt>Reviewed</dt><dd>{word.review_count}</dd>
      <dt>Remembered</dt><dd>{word.remembered_count}</dd>
      <dt>Forgotten</dt><dd>{word.forgotten_count}</dd>
      <dt>Last review</dt><dd>{formatDate(word.last_reviewed_at)}</dd>
    </dl></section>}
  </article>;
}
