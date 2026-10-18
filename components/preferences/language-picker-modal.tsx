"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import preferencesImage from "@/public/assets/preferences.webp";
import { LANGUAGES } from "@/lib/language";

/**
 * Language chooser used from the profile page. Selecting a row applies it
 * immediately; the dialog stays open while the request runs and only closes
 * once it succeeds, so a failure never looks like it worked.
 */
export function LanguagePickerModal({
  open,
  current,
  saving,
  error,
  onSelect,
  onClose,
}: {
  open: boolean;
  current: string;
  saving: string | null;
  error: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const busy = saving !== null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="language-picker-title"
      describedBy="language-picker-description"
      canDismiss={() => !busy}
      maxWidthClass="max-w-md"
    >
      <div className="flex flex-col items-center text-center">
        <Image
          src={preferencesImage}
          alt=""
          aria-hidden="true"
          sizes="80px"
          className="h-20 w-auto object-contain"
        />

        <h2
          id="language-picker-title"
          className="mt-3 text-[18px] leading-tight font-semibold text-ink"
        >
          Translation language
        </h2>
        <p
          id="language-picker-description"
          className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted"
        >
          Word details will show the meaning in this language.
        </p>
      </div>

      <div
        className="mt-4 divide-y divide-line-soft overflow-hidden rounded-xl border border-line"
        role="radiogroup"
        aria-label="Translation language"
      >
        {LANGUAGES.map((item) => {
          const active = current === item.code;
          const pending = saving === item.code;
          return (
            <label
              key={item.code}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-hover focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-focus ${
                pending ? "opacity-60" : ""
              } ${busy ? "cursor-not-allowed" : ""}`}
            >
              <input
                className="sr-only"
                type="radio"
                name="picker-language"
                value={item.code}
                checked={active}
                disabled={busy}
                onChange={() => onSelect(item.code)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-ink">
                  {item.nativeName}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {item.name} · {item.sample}
                </span>
              </span>
              {active ? (
                <Check
                  size={17}
                  className="shrink-0 text-accent"
                  aria-hidden="true"
                />
              ) : null}
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2 text-[12px] text-hard"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-line bg-surface text-[13px] font-semibold text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        type="button"
        disabled={busy}
        onClick={onClose}
      >
        {saving ? "Saving…" : "Cancel"}
      </button>
    </Modal>
  );
}
