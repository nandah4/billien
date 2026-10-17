"use client";

import { Sparkles } from "lucide-react";
import { cardClass, outlineButton } from "@/lib/ui";

export function DrillLauncher({
  loading,
  onStart,
}: {
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <div className={`${cardClass} shrink-0 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              Uji Pemahaman Kata Ini
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Latihan kalimat rumpang &amp; flashcard instan
            </p>
          </div>
        </div>
        <button
          className={outlineButton}
          type="button"
          disabled={loading}
          onClick={onStart}
        >
          Start Drill
        </button>
      </div>
    </div>
  );
}
