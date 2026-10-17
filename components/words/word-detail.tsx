"use client";

import {
  BookOpenText,
  CheckCircle2,
  Languages,
  LogIn,
  Plus,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DictionaryEntry, SavedWord } from "@/lib/types";
import { outlineButton, primaryButton } from "@/lib/ui";

type DetailWord = DictionaryEntry | SavedWord;

function audioUrl(word: DetailWord | null) {
  const url = word?.phonetics?.map((item) => item.audio?.trim()).find(Boolean);
  if (!url) return null;
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  try {
    const parsed = new URL(normalized);
    const isAllowed =
      parsed.protocol === "https:" &&
      ((parsed.hostname === "ssl.gstatic.com" &&
        parsed.pathname.startsWith("/dictionary/static/sounds/")) ||
        (parsed.hostname === "api.dictionaryapi.dev" &&
          parsed.pathname.startsWith("/media/pronunciations/")));
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function primaryDefinition(word: DetailWord) {
  return word.meanings?.[0]?.definitions?.[0]?.definition?.trim() ?? null;
}

function distinctPartsOfSpeech(word: DetailWord, limit = 3) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const meaning of word.meanings ?? []) {
    const part = meaning.partOfSpeech?.trim();
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
    if (out.length >= limit) break;
  }
  return out;
}

function collectTags(
  word: DetailWord,
  kind: "synonyms" | "antonyms",
  limit = 6,
) {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (values?: string[]) => {
    for (const value of values ?? []) {
      const tag = value?.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
      if (out.length >= limit) return;
    }
  };
  for (const meaning of word.meanings ?? []) {
    push(meaning[kind]);
    for (const definition of meaning.definitions ?? []) push(definition[kind]);
    if (out.length >= limit) break;
  }
  return out;
}

function collectExamples(word: DetailWord, limit = 3) {
  const out: string[] = [];
  for (const meaning of word.meanings ?? []) {
    for (const definition of meaning.definitions ?? []) {
      const example = definition.example?.trim();
      if (example) out.push(example);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function TagRow({
  label,
  tags,
  tone,
}: {
  label: string;
  tags: string[];
  tone: "synonym" | "antonym";
}) {
  if (tags.length === 0) return null;
  const chip =
    tone === "synonym"
      ? "border-line bg-surface text-ink-soft"
      : "border-hard-soft bg-hard-soft/60 text-hard";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-muted">{label}:</span>
      {tags.map((tag) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${chip}`}
          key={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function StatePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <BookOpenText size={16} className="text-accent" aria-hidden="true" />
        Detail Words
      </div>
      <p className="mt-4 text-[11px] font-semibold tracking-wider text-faint uppercase">
        {title}
      </p>
      <div className="mt-2 text-[13px] leading-relaxed text-muted">
        {children}
      </div>
    </article>
  );
}

export function WordDetail({
  word,
  isLoading = false,
  errorMessage = null,
  isSaving = false,
  onSave,
  onSignIn,
}: {
  word: DetailWord | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSaving?: boolean;
  onSave?: () => void;
  onSignIn?: () => void;
}) {
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [audioError, setAudioError] = useState<{
    source: string;
    message: string;
  } | null>(null);
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
      const payload = (await response.json()) as { audio?: string };
      if (!response.ok || !payload.audio)
        throw new Error("Audio asset unavailable.");

      const binary = atob(payload.audio);
      const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(
        new Blob([bytes], { type: "audio/mpeg" }),
      );

      player.pause();
      player.src = objectUrlRef.current;
      player.currentTime = 0;
      player.muted = false;
      player.volume = 1;
      await player.play();
    } catch {
      setAudioError({
        source: audio,
        message:
          "Pronunciation audio could not be played. Please try another word.",
      });
    } finally {
      setIsPlaying(false);
    }
  }

  if (isLoading) {
    return (
      <StatePanel title="Loading">
        <p>Loading the selected word…</p>
      </StatePanel>
    );
  }

  if (errorMessage) {
    return (
      <StatePanel title="Could not load">
        <p className="text-hard">{errorMessage}</p>
      </StatePanel>
    );
  }

  if (!word) {
    return (
      <StatePanel title="No word selected">
        <p>
          Select a word from the list to see its meaning, example sentences, and
          pronunciation.
        </p>
      </StatePanel>
    );
  }

  const saved = isSavedWord(word);
  const partsOfSpeech = distinctPartsOfSpeech(word);
  const synonyms = collectTags(word, "synonyms");
  const antonyms = collectTags(word, "antonyms");
  const examples = collectExamples(word);
  const definition = primaryDefinition(word);
  const sourceUrls = saved ? word.source_urls : (word.sourceUrls ?? []);

  return (
    <article>
      <audio
        ref={playerRef}
        onError={() =>
          audio &&
          setAudioError({
            source: audio,
            message: "Pronunciation audio could not be loaded for this word.",
          })
        }
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <BookOpenText size={16} className="text-accent" aria-hidden="true" />
          Detail Words
        </div>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-easy-soft px-2.5 py-1 text-[11px] font-semibold text-easy">
            <CheckCircle2 size={13} aria-hidden="true" />
            Sudah Dihafal
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em] wrap-anywhere">
            {word.word}
          </h2>
          {word.phonetic ? (
            <p className="mt-1 text-[13px] text-muted italic">
              {word.phonetic}
            </p>
          ) : null}
        </div>
        {audio ? (
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-hover disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            disabled={isPlaying}
            title={`Play pronunciation for ${word.word}`}
            onClick={() => void playPronunciation()}
          >
            <Volume2 size={15} aria-hidden="true" />
            Listen{word.phonetic ? ` ${word.phonetic}` : ""}
          </button>
        ) : null}
      </div>

      {partsOfSpeech.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {partsOfSpeech.map((part) => (
            <span
              className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent ring-1 ring-accent-line ring-inset"
              key={part}
            >
              {part}
            </span>
          ))}
        </div>
      ) : null}

      {audioError?.source === audio ? (
        <p className="mt-3 text-[12px] text-hard" role="status">
          {audioError.message}
        </p>
      ) : null}

      <section className="mt-5 rounded-xl border border-line bg-subtle p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Arti / Definisi
          </h3>
          <Languages size={15} className="text-faint" aria-hidden="true" />
        </div>
        {definition ? (
          <p className="mt-3 text-[15px] leading-relaxed text-ink italic">
            &ldquo;{definition}&rdquo;
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-muted">
            The dictionary did not provide a definition for this word.
          </p>
        )}
        <TagRow label="Sinonim" tags={synonyms} tone="synonym" />
        <TagRow label="Antonim" tags={antonyms} tone="antonym" />
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Contoh Kalimat
          </h3>
          {examples.length > 0 ? (
            <span className="text-[11px] font-medium text-accent">
              {examples.length} Contoh
            </span>
          ) : null}
        </div>
        {examples.length > 0 ? (
          <ol className="mt-3 grid list-none gap-2 p-0">
            {examples.map((example, index) => (
              <li
                className="flex gap-3 rounded-xl border border-line bg-surface p-3"
                key={`${example}-${index}`}
              >
                <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
                  {index + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  &ldquo;{example}&rdquo;
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-[13px] text-muted">
            No example sentences were provided for this word.
          </p>
        )}
      </section>

      <section className="mt-5 rounded-xl border border-line bg-subtle p-4">
        {saved ? (
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-easy"
              aria-hidden="true"
            />
            <div>
              <p className="text-[13px] font-semibold text-ink">
                Sudah Dihafalkan
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                Saved to your memorised list.
              </p>
            </div>
          </div>
        ) : onSave ? (
          <button
            className={`${primaryButton} w-full`}
            type="button"
            disabled={isSaving}
            onClick={onSave}
          >
            <Plus size={16} aria-hidden="true" />
            {isSaving ? "Saving…" : "Tandai Sudah Hafal"}
          </button>
        ) : onSignIn ? (
          <button
            className={`${outlineButton} w-full`}
            type="button"
            onClick={onSignIn}
          >
            <LogIn size={16} aria-hidden="true" />
            Sign in to save
          </button>
        ) : null}

        {saved ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
            <div>
              <dt className="text-muted">Dihafal</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {formatDate(word.added_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Terakhir di-review</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {formatDate(word.last_reviewed_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total review</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {word.review_count}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Ingat / Lupa</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {word.remembered_count} / {word.forgotten_count}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {sourceUrls.length > 0 ? (
        <section className="mt-5 border-t border-line-soft pt-4">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Source
          </h3>
          <div className="mt-2 grid gap-1">
            {sourceUrls.map((url) => (
              <a
                className="text-[12px] text-accent underline decoration-accent-line wrap-anywhere hover:decoration-accent"
                href={url}
                key={url}
                target="_blank"
                rel="noreferrer"
              >
                {url}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
