"use client";

import { outlineButton } from "@/lib/ui";
import type { RecallPrompt } from "@/lib/recall/types";

/**
 * Renders the prompt for any mode. Typing modes show the meaning, definition,
 * or cloze sentence; `choice` shows the headword and its options, which are the
 * only case where the answer is selectable rather than typed.
 */
export function RecallPromptView({
  prompt,
  disabled = false,
  onChoose,
}: {
  prompt: RecallPrompt;
  disabled?: boolean;
  onChoose?: (label: string) => void;
}) {
  if (prompt.kind === "translation") {
    return (
      <div>
        <div className="flex flex-wrap gap-1.5">
          {prompt.words.map((word) => (
            <span
              key={word}
              className="rounded-full border border-accent-line bg-surface px-2.5 py-1 text-[14px] font-medium text-ink"
            >
              {word}
            </span>
          ))}
        </div>
        {prompt.definition ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {prompt.definition}
          </p>
        ) : null}
      </div>
    );
  }

  if (prompt.kind === "definition") {
    return (
      <p className="text-[15px] leading-relaxed text-ink">{prompt.definition}</p>
    );
  }

  if (prompt.kind === "cloze") {
    return (
      <div>
        <p className="text-[15px] leading-relaxed text-ink">{prompt.sentence}</p>
        {prompt.definition ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {prompt.definition}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[22px] leading-tight font-semibold text-ink">
        {prompt.word}
      </p>
      {prompt.phonetic ? (
        <p className="mt-0.5 text-[13px] text-muted">{prompt.phonetic}</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {prompt.options.map((option) => (
          <button
            key={option.id}
            className={`${outlineButton} justify-start`}
            type="button"
            disabled={disabled || !onChoose}
            onClick={() => onChoose?.(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
