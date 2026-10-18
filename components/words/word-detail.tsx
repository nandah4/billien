"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronRight,
  Languages,
  LogIn,
  Plus,
  Volume2,
  X,
} from "lucide-react";
import {
  collectExamples,
  collectForms,
  collectTags,
  distinctPartsOfSpeech,
  isSavedWord,
  primaryDefinition,
  translationGroups,
} from "@/lib/library";
import { languageLabel } from "@/lib/language";
import type { DictionaryResult, Entry, SavedWord } from "@/lib/types";
import {
  compactOutline,
  compactPrimary,
  outlineButton,
  primaryButton,
} from "@/lib/ui";

type DetailWord = SavedWord | DictionaryResult;

/** Shared chip treatment. Design.md allows 6–8px, never a full pill. */
const chipClass =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium";

function subscribeToNothing() {
  return () => {};
}

function PanelHeader({
  children,
  onClose,
}: {
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    // Negative margins cancel the card padding so the divider runs edge to edge.
    <div className="-mx-4 -mt-4 mb-5 flex items-center justify-between gap-3 border-b border-line-soft px-4 pt-4 pb-3">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-ink">
        <BookOpenText size={15} className="text-accent" aria-hidden="true" />
        Detail Words
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {onClose ? (
          <button
            className="-mr-1 inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            onClick={onClose}
            aria-label="Close detail"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
        {children}
      </h3>
      {aside}
    </div>
  );
}

function StatePanel({
  title,
  children,
  onRetry,
  onClose,
  showHeader = true,
}: {
  title: string;
  children: React.ReactNode;
  onRetry?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
}) {
  return (
    <article>
      {showHeader ? <PanelHeader onClose={onClose} /> : null}
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
          Try again
        </button>
      ) : null}
    </article>
  );
}

function DetailSkeleton({
  onClose,
  showHeader = true,
}: {
  onClose?: () => void;
  showHeader?: boolean;
}) {
  return (
    <article aria-busy="true" aria-label="Loading word detail">
      {showHeader ? <PanelHeader onClose={onClose} /> : null}
      <div className="mt-5 grid gap-3">
        <span className="h-8 w-2/3 animate-pulse rounded-lg bg-subtle" />
        <span className="h-4 w-1/3 animate-pulse rounded bg-subtle" />
        <span className="mt-2 h-24 w-full animate-pulse rounded-lg bg-subtle" />
        <span className="h-14 w-full animate-pulse rounded-lg bg-subtle" />
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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] font-medium text-muted">{label}</span>
      {tags.map((tag) => (
        <span className={`${chipClass} ${chip}`} key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
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
  isReviewing = false,
  onSave,
  onReview,
  onSignIn,
  onRetry,
  onClose,
  showHeader = true,
}: {
  word: DetailWord | null;
  preferredLanguage: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  isSaving?: boolean;
  isReviewing?: boolean;
  onSave?: () => void;
  /** Records a successful recall, which increments the review counters. */
  onReview?: () => void;
  onSignIn?: () => void;
  onRetry?: () => void;
  onClose?: () => void;
  /** The mobile sheet renders its own fixed header, so the body hides this one. */
  showHeader?: boolean;
}) {
  const [speaking, setSpeaking] = useState(false);
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

  if (isLoading && !word)
    return <DetailSkeleton onClose={onClose} showHeader={showHeader} />;

  if (errorMessage) {
    return (
      <StatePanel
        title="Could not load"
        onRetry={onRetry}
        onClose={onClose}
        showHeader={showHeader}
      >
        <p className="text-hard" role="alert">
          {errorMessage}
        </p>
      </StatePanel>
    );
  }

  if (!word) {
    return (
      <StatePanel
        title="No word selected"
        onClose={onClose}
        showHeader={showHeader}
      >
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
  const groups = translationGroups(entries, preferredLanguage);
  const englishDefinitions = definitions(entries);
  const forms = collectForms(entries);
  const examples = collectExamples(entries);
  const synonyms = collectTags(entries, "synonyms");
  const antonyms = collectTags(entries, "antonyms");
  const source = word.source;
  const fallbackDefinition = primaryDefinition(word);
  const hasAiTranslation = groups.some((group) => group.source === "ai");

  return (
    <article>
      {showHeader ? <PanelHeader onClose={onClose}></PanelHeader> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-ink wrap-anywhere">
            {word.word}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {phonetic ? (
              <span className="text-[13px] text-muted italic">{phonetic}</span>
            ) : null}
            {partsOfSpeech.map((part) => (
              <span
                className={`${chipClass} border-accent-line bg-accent-soft text-accent`}
                key={part}
              >
                {part}
              </span>
            ))}
          </div>
        </div>
        {speechSupported ? (
          <button
            className={`${compactOutline} shrink-0`}
            type="button"
            aria-pressed={speaking}
            title={`Play pronunciation for ${word.word}`}
            onClick={speak}
          >
            <Volume2
              size={14}
              className={speaking ? "animate-pulse" : undefined}
              aria-hidden="true"
            />
            Listen
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">
          Meaning ({languageLabel(preferredLanguage)})
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {hasAiTranslation ? (
            <span
              className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-faint uppercase"
              title="Machine translated, not from the dictionary"
            >
              AI
            </span>
          ) : null}
          <Languages size={14} className="text-faint" aria-hidden="true" />
        </div>
      </div>

      <div className="py-4">
        {groups.length > 0 ? (
          <div className="grid gap-4">
            {groups.map((group) => (
              <div key={group.partOfSpeech || "unknown"}>
                <p className="text-[11px] font-semibold text-faint capitalize">
                  {group.partOfSpeech || "Other"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.words.map((translation) => (
                    <span
                      className="inline-flex items-center rounded border border-line bg-surface px-2 py-1 text-[13px] leading-none text-ink"
                      key={translation}
                    >
                      {translation}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            No translation available for this language yet.
          </p>
        )}

        {groups.length === 0 && englishDefinitions.length === 0 ? (
          fallbackDefinition ? (
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              {fallbackDefinition}
            </p>
          ) : null
        ) : null}
      </div>

      {englishDefinitions.length > 0 ? (
        <details className="group py-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <ChevronRight
              size={13}
              className="transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
            English definitions
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

      {forms.length > 0 ? (
        <section className="mt-5">
          <SectionHeading>Word Forms</SectionHeading>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {forms.map((form) => (
              <span
                className={`${chipClass} rounded! border-line bg-surface text-ink-soft`}
                key={form}
              >
                {form}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5">
        <SectionHeading
          aside={
            examples.length > 0 ? (
              <span className="text-[11px] font-medium text-accent">
                {examples.length}{" "}
                {examples.length === 1 ? "Example" : "Examples"}
              </span>
            ) : null
          }
        >
          Example Sentences
        </SectionHeading>
        {examples.length > 0 ? (
          <ol className="mt-2.5 grid list-none gap-2.5 p-0">
            {examples.map((example, index) => (
              <li
                className="flex gap-2.5 rounded-lg border border-line bg-surface p-3"
                key={`${example}-${index}`}
              >
                <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[11px] font-bold text-accent">
                  {index + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  &ldquo;{example}&rdquo;
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[12px] text-muted">
            No example sentences for this word.
          </p>
        )}
      </section>

      {synonyms.length > 0 || antonyms.length > 0 ? (
        <section className="mt-5 grid gap-2.5">
          <TagRow label="Synonyms" tags={synonyms} tone="synonym" />
          <TagRow label="Antonyms" tags={antonyms} tone="antonym" />
        </section>
      ) : null}

      <section className="mt-5 rounded-lg border border-line bg-subtle p-4">
        {savedWord ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <CheckCircle2
                size={16}
                className="shrink-0 text-easy"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="mt-0.5 font-medium text-sm text-muted">
                  {savedWord.review_count === 0
                    ? "No reviews yet"
                    : `${savedWord.review_count} total ${
                        savedWord.review_count === 1 ? "review" : "reviews"
                      }`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {onReview ? (
                <button
                  className={`${compactPrimary} cursor-pointer hover:scale-105`}
                  type="button"
                  disabled={isReviewing}
                  title="Record a successful recall"
                  onClick={onReview}
                >
                  <Check size={14} aria-hidden="true" />
                  {isReviewing ? "Saving…" : "Remembered"}
                </button>
              ) : null}
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
            {isSaving ? "Saving…" : "Mark as memorised"}
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
      </section>

      {source ? (
        <section className="mt-4 border-t border-line-soft pt-3">
          <SectionHeading>Source</SectionHeading>
          <a
            className="mt-1.5 block text-[12px] text-accent underline decoration-accent-line wrap-anywhere hover:decoration-accent"
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
