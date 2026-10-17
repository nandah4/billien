"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  capitalize,
  entryPartOfSpeech,
  primaryDefinition,
  type LibraryWord,
} from "@/lib/library";

export function WordRow({
  item,
  active,
  saving,
  unsaving,
  onSelect,
  onSave,
  onUnsave,
}: {
  item: LibraryWord;
  active: boolean;
  saving: boolean;
  unsaving: boolean;
  onSelect: (item: LibraryWord) => void;
  onSave: (word: string) => void;
  onUnsave?: (item: LibraryWord) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const part = entryPartOfSpeech(item);
  const definition = primaryDefinition(item);
  const translation = item.translation.slice(0, 3).join(" · ");

  useEffect(() => {
    if (!confirming) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirming(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirming]);

  if (confirming && item.savedWord && onUnsave) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hard-soft bg-hard-soft/40 p-3">
        <span className="mr-auto text-[12px] font-medium text-hard">
          Remove &ldquo;{item.word}&rdquo;?
        </span>
        <button
          className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          className="inline-flex h-8 items-center justify-center rounded-lg bg-hard px-2.5 text-[12px] font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          disabled={unsaving}
          onClick={() => {
            setConfirming(false);
            onUnsave(item);
          }}
        >
          {unsaving ? "Removing…" : "Yes"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-3 transition ${
        active
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:bg-hover"
      }`}
    >
      <button
        className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        type="button"
        onClick={() => onSelect(item)}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-ink wrap-anywhere">
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

        {translation ? (
          <>
            <span className="mt-1 line-clamp-1 text-[12px] leading-relaxed text-ink-soft">
              {translation}
            </span>
            {definition ? (
              <span className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-faint">
                {definition}
              </span>
            ) : null}
          </>
        ) : definition ? (
          <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">
            {definition}
          </span>
        ) : null}
      </button>

      {item.savedWord ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex size-8 items-center justify-center rounded-lg bg-easy-soft text-easy"
            title="Already memorised"
          >
            <Check size={16} aria-hidden="true" />
          </span>
          {onUnsave ? (
            <button
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-muted opacity-100 transition hover:bg-hard-soft hover:text-hard focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
              type="button"
              disabled={unsaving}
              onClick={() => setConfirming(true)}
              title={`Remove "${item.word}" from Remembered`}
              aria-label={`Remove ${item.word} from Remembered`}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      ) : (
        <button
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          disabled={saving}
          onClick={() => onSave(item.word)}
          title={`Mark "${item.word}" as memorised`}
          aria-label={`Mark ${item.word} as memorised`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
