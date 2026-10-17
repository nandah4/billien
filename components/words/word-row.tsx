"use client";

import { Check, Plus } from "lucide-react";
import { capitalize, primaryDefinition, type LibraryWord } from "@/lib/library";

export function WordRow({
  item,
  active,
  saving,
  onSelect,
  onSave,
}: {
  item: LibraryWord;
  active: boolean;
  saving: boolean;
  onSelect: (item: LibraryWord) => void;
  onSave: (word: string) => void;
}) {
  const part = item.meanings[0]?.partOfSpeech;
  const definition = primaryDefinition(item);

  return (
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
        onClick={() => onSelect(item)}
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
          disabled={saving}
          onClick={() => onSave(item.word)}
          title={`Tandai "${item.word}" sudah hafal`}
          aria-label={`Tandai ${item.word} sudah hafal`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
