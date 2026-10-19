"use client";

import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { LanguageList } from "@/components/preferences/language-list";
import preferencesImage from "@/public/assets/preferences.webp";

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

      <div className="mt-4">
        <LanguageList current={current} saving={saving} onSelect={onSelect} />
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
