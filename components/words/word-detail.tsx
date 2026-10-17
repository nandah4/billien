"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Languages,
  LogIn,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  collectExamples,
  collectForms,
  collectTags,
  distinctPartsOfSpeech,
  isSavedWord,
  primaryDefinition,
} from "@/lib/library";
import { languageLabel } from "@/lib/language";
import type { DictionaryResult, Entry, SavedWord } from "@/lib/types";
import { headerOutline, outlineButton, primaryButton } from "@/lib/ui";

type DetailWord = SavedWord | DictionaryResult;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function subscribeToNothing() {
  return () => {};
}

function StatePanel({
  title,
  children,
  onRetry,
}: {
  title: string;
  children: React.ReactNode;
  onRetry?: () => void;
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
      {onRetry ? (
        <button
          className={`${outlineButton} mt-4`}
          type="button"
          onClick={onRetry}
        >
          Coba lagi
        </button>
      ) : null}
    </article>
  );
}

function DetailSkeleton() {
  return (
    <article aria-busy="true" aria-label="Memuat detail kata">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <BookOpenText size={16} className="text-accent" aria-hidden="true" />
        Detail Words
      </div>
      <div className="mt-5 grid gap-3">
        <span className="h-8 w-2/3 animate-pulse rounded-lg bg-subtle" />
        <span className="h-4 w-1/3 animate-pulse rounded bg-subtle" />
        <span className="mt-2 h-20 w-full animate-pulse rounded-xl bg-subtle" />
        <span className="h-14 w-full animate-pulse rounded-xl bg-subtle" />
        <span className="h-14 w-full animate-pulse rounded-xl bg-subtle" />
      </div>
    </article>
  );
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

type TranslationSense = {
  partOfSpeech: string;
  words: string[];
};

function translationSenses(entries: Entry[], language: string) {
  const out: TranslationSense[] = [];
  for (const entry of entries) {
    for (const sense of entry.senses) {
      const words = sense.translations[language];
      if (!words || words.length === 0) continue;
      out.push({ partOfSpeech: entry.partOfSpeech, words });
      if (out.length >= 6) return out;
    }
  }
  return out;
}

function definitions(entries: Entry[]) {
  const out: { partOfSpeech: string; definition: string }[] = [];
  for (const entry of entries) {
    for (const sense of entry.senses) {
      if (!sense.definition) continue;
      out.push({
        partOfSpeech: entry.partOfSpeech,
        definition: sense.definition,
      });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

export function WordDetail({
  word,
  preferredLanguage,
  isLoading = false,
  errorMessage = null,
  isSaving = false,
  isUnsaving = false,
  onSave,
  onUnsave,
  onSignIn,
  onRetry,
}: {
  word: DetailWord | null;
  preferredLanguage: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSaving?: boolean;
  isUnsaving?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  onSignIn?: () => void;
  onRetry?: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [confirmingUnsave, setConfirmingUnsave] = useState(false);
  const wordText = word?.word ?? "";

  const speechSupported = useSyncExternalStore(
    subscribeToNothing,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );

  // Stop any utterance when the word changes or the panel unmounts.
  useEffect(() => {
    if (!speechSupported) return;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [speechSupported, wordText]);

  useEffect(() => {
    if (!confirmingUnsave) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmingUnsave(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmingUnsave]);

  function speak() {
    if (!speechSupported || !wordText) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  if (isLoading && !word) return <DetailSkeleton />;

  if (errorMessage) {
    return (
      <StatePanel title="Could not load" onRetry={onRetry}>
        <p className="text-hard" role="alert">
          {errorMessage}
        </p>
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

  const savedWord = isSavedWord(word) ? word : null;
  const entries = word.entries ?? [];
  const partsOfSpeech = distinctPartsOfSpeech(entries);
  const phonetic =
    savedWord?.phonetic ??
    entries.flatMap((entry) => entry.pronunciations)[0]?.text ??
    null;
  const translations = translationSenses(entries, preferredLanguage);
  const englishDefinitions = definitions(entries);
  const forms = collectForms(entries);
  const examples = collectExamples(entries);
  const synonyms = collectTags(entries, "synonyms");
  const antonyms = collectTags(entries, "antonyms");
  const source = word.source;
  const fallbackDefinition = primaryDefinition(word);

  return (
    <article>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <BookOpenText size={16} className="text-accent" aria-hidden="true" />
          Detail Words
        </div>
        {savedWord ? (
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
          {phonetic ? (
            <p className="mt-1 text-[13px] text-muted italic">{phonetic}</p>
          ) : null}
        </div>
        {speechSupported ? (
          <button
            className={`${headerOutline} shrink-0`}
            type="button"
            aria-pressed={speaking}
            title={`Play pronunciation for ${word.word}`}
            onClick={speak}
          >
            <Volume2
              size={15}
              className={speaking ? "animate-pulse" : undefined}
              aria-hidden="true"
            />
            Listen
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

      <section className="mt-5 rounded-xl border border-line bg-subtle p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Arti / Definisi ({languageLabel(preferredLanguage).toUpperCase()})
          </h3>
          <Languages size={15} className="text-faint" aria-hidden="true" />
        </div>

        {translations.length > 0 ? (
          <>
            <ul className="mt-3 grid list-none gap-3 p-0">
              {translations.map((sense, index) => (
                <li key={`${sense.partOfSpeech}-${index}`}>
                  {sense.partOfSpeech ? (
                    <span className="text-[10px] font-semibold tracking-wider text-faint uppercase">
                      {sense.partOfSpeech}
                    </span>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {sense.words.map((translation) => (
                      <span
                        className="rounded-full border border-accent-line bg-surface px-2.5 py-1 text-[13px] font-medium text-ink"
                        key={translation}
                      >
                        {translation}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            {englishDefinitions.length > 0 ? (
              <details className="mt-4 border-t border-line-soft pt-3">
                <summary className="cursor-pointer text-[12px] font-medium text-muted transition hover:text-ink">
                  Definisi bahasa Inggris
                </summary>
                <ol className="mt-2 grid list-none gap-2 p-0">
                  {englishDefinitions.map((item, index) => (
                    <li
                      className="text-[12px] leading-relaxed text-ink-soft"
                      key={`${item.partOfSpeech}-${index}`}
                    >
                      {item.partOfSpeech ? (
                        <span className="mr-1.5 text-[10px] font-semibold tracking-wider text-faint uppercase">
                          {item.partOfSpeech}
                        </span>
                      ) : null}
                      {item.definition}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-3 text-[13px] text-muted">
              Terjemahan belum tersedia untuk bahasa ini.
            </p>
            {englishDefinitions.length > 0 ? (
              <ol className="mt-3 grid list-none gap-2 p-0">
                {englishDefinitions.map((item, index) => (
                  <li
                    className="text-[13px] leading-relaxed text-ink-soft"
                    key={`${item.partOfSpeech}-${index}`}
                  >
                    {item.partOfSpeech ? (
                      <span className="mr-1.5 text-[10px] font-semibold tracking-wider text-faint uppercase">
                        {item.partOfSpeech}
                      </span>
                    ) : null}
                    {item.definition}
                  </li>
                ))}
              </ol>
            ) : fallbackDefinition ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                {fallbackDefinition}
              </p>
            ) : null}
          </>
        )}

        <TagRow label="Sinonim" tags={synonyms} tone="synonym" />
        <TagRow label="Antonim" tags={antonyms} tone="antonym" />
      </section>

      {forms.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Bentuk Kata
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {forms.map((form, index) => (
              <span className="inline-flex items-center gap-1.5" key={form}>
                {index > 0 ? (
                  <span className="text-[11px] text-faint" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                  {form}
                </span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

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
        {savedWord ? (
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

        {savedWord ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
            <div>
              <dt className="text-muted">Dihafal</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {formatDate(savedWord.added_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Terakhir di-review</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {formatDate(savedWord.last_reviewed_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total review</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {savedWord.review_count}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Ingat / Lupa</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {savedWord.remembered_count} / {savedWord.forgotten_count}
              </dd>
            </div>
          </dl>
        ) : null}

        {savedWord && onUnsave ? (
          confirmingUnsave ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-hard-soft bg-hard-soft/40 p-2.5">
              <span className="mr-auto text-[12px] font-medium text-hard">
                Hapus kata ini dari Remembered?
              </span>
              <button
                className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                type="button"
                onClick={() => setConfirmingUnsave(false)}
              >
                Batal
              </button>
              <button
                className="inline-flex h-8 items-center justify-center rounded-lg bg-hard px-2.5 text-[12px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                type="button"
                disabled={isUnsaving}
                onClick={() => {
                  setConfirmingUnsave(false);
                  onUnsave();
                }}
              >
                {isUnsaving ? "Menghapus…" : "Ya, hapus"}
              </button>
            </div>
          ) : (
            <button
              className={`${outlineButton} mt-4`}
              type="button"
              disabled={isUnsaving}
              onClick={() => setConfirmingUnsave(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Hapus dari Remembered
            </button>
          )
        ) : null}
      </section>

      {source ? (
        <section className="mt-5 border-t border-line-soft pt-4">
          <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
            Source
          </h3>
          <a
            className="mt-2 block text-[12px] text-accent underline decoration-accent-line wrap-anywhere hover:decoration-accent"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.url}
          </a>
          {source.license ? (
            <p className="mt-1 text-[11px] text-faint">
              {source.license.url ? (
                <a
                  className="underline decoration-line hover:text-muted"
                  href={source.license.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.license.name}
                </a>
              ) : (
                source.license.name
              )}
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
