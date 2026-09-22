"use client";

import { BookmarkPlus, Volume2 } from "lucide-react";
import type { DictionaryEntry, DictionaryMeaning, SavedWord } from "@/lib/types";

type DetailWord = DictionaryEntry | SavedWord;

function audioUrl(word: DetailWord) {
  const url = word.phonetics?.map((item) => item.audio).find(Boolean);
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
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
  return <div className="meaning">
    <span className="part-of-speech">{meaning.partOfSpeech}</span>
    <ol className="definition-list">
      {meaning.definitions.slice(0, 3).map((definition, index) => <li key={`${definition.definition}-${index}`}>
        {definition.definition}
        {definition.example && <em className="example">“{definition.example}”</em>}
      </li>)}
    </ol>
    {tags.length > 0 && <div className="word-tags">{tags.map((tag) => <span className="word-tag" key={tag}>{tag}</span>)}</div>}
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
  if (isLoading) return <div className="detail-empty">
    <p className="eyebrow">Dictionary detail</p>
    <p>Loading the selected word…</p>
  </div>;
  if (errorMessage) return <div className="detail-empty">
    <p className="eyebrow">Dictionary detail</p>
    <p className="detail-error">{errorMessage}</p>
  </div>;
  if (!word) return <div className="detail-empty">
    <p className="eyebrow">Word detail</p>
    <p>Select a word to see its meanings, examples, source, and pronunciation when available.</p>
  </div>;

  const audio = audioUrl(word);
  const sourceUrls = isSavedWord(word) ? word.source_urls : word.sourceUrls ?? [];
  const saved = isSavedWord(word);
  return <article>
    <p className="eyebrow">{saved ? "Remembered word" : "Dictionary detail"}</p>
    <div className="detail-heading">
      <div><h2 className="detail-word">{word.word}</h2>{word.phonetic && <p className="phonetic">{word.phonetic}</p>}</div>
      {audio && <button className="icon-button" type="button" title="Play pronunciation" aria-label="Play pronunciation" onClick={() => {
        void new Audio(audio).play().catch(() => undefined);
      }}><Volume2 size={19} /></button>}
    </div>

    <section className="detail-section"><h3>Meanings</h3>
      {word.meanings.length > 0 ? word.meanings.map((meaning, index) => <Meaning key={`${meaning.partOfSpeech}-${index}`} meaning={meaning} />) : <p className="detail-empty">No meanings were supplied by the dictionary.</p>}
    </section>

    {sourceUrls.length > 0 && <section className="detail-section"><h3>Source</h3>
      {sourceUrls.map((url) => <p key={url}><a className="source-link" href={url} target="_blank" rel="noreferrer">{url}</a></p>)}
    </section>}

    {!saved && <section className="detail-section">{onRemember ? <button className="primary-button" type="button" disabled={isSaving} onClick={onRemember}><BookmarkPlus size={17} />{isSaving ? "Saving" : "Add to Remember"}</button> : onSignIn ? <button className="outline-button" type="button" onClick={onSignIn}><BookmarkPlus size={17} />Sign in to Remember</button> : null}</section>}

    {saved && <section className="detail-section"><h3>Review record</h3><dl className="metadata">
      <dt>Added</dt><dd>{formatDate(word.added_at)}</dd>
      <dt>Reviewed</dt><dd>{word.review_count}</dd>
      <dt>Remembered</dt><dd>{word.remembered_count}</dd>
      <dt>Forgotten</dt><dd>{word.forgotten_count}</dd>
      <dt>Last review</dt><dd>{formatDate(word.last_reviewed_at)}</dd>
    </dl></section>}
  </article>;
}
