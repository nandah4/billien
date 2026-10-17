"use client";

import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import { LANGUAGES, normalizeLanguage } from "@/lib/language";
import type { UserPreferences } from "@/lib/types";
import { outlineButton, primaryButton } from "@/lib/ui";

/**
 * First-login onboarding. Choosing a language and skipping both mark the
 * account as onboarded, so the dialog never returns.
 */
export function LanguageModal({
  currentLanguage,
  onSaved,
}: {
  currentLanguage: string;
  onSaved: (preferences: UserPreferences) => void;
}) {
  const [selected, setSelected] = useState(() =>
    normalizeLanguage(currentLanguage),
  );
  const [pending, setPending] = useState<"save" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(onboarded: boolean) {
    setPending(onboarded ? "skip" : "save");
    setError(null);
    try {
      const response = await request<ApiEnvelope<UserPreferences>>(
        "/api/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            onboarded
              ? { onboarded: true }
              : { translationLanguage: selected, onboarded: true },
          ),
        },
      );
      onSaved(response.data);
    } catch (requestError) {
      setError(
        messageFor(requestError, "Unable to save your language preference."),
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal
      open
      onClose={() => void submit(true)}
      labelledBy="language-modal-title"
      describedBy="language-modal-description"
      canDismiss={() => pending === null}
      maxWidthClass="max-w-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Languages size={16} aria-hidden="true" />
          </span>
          Billien
        </span>
      </div>

      <h2
        id="language-modal-title"
        className="mt-4 text-[20px] leading-tight font-bold tracking-[-0.02em]"
      >
        Pilih bahasa terjemahan
      </h2>
      <p
        id="language-modal-description"
        className="mt-2 text-[13px] leading-relaxed text-muted"
      >
        Setiap kata akan menampilkan artinya dalam bahasa ini. Kamu bisa
        mengubahnya nanti di halaman profil.
      </p>

      <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Bahasa terjemahan">
        {LANGUAGES.map((language) => {
          const active = selected === language.code;
          return (
            <label
              key={language.code}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:bg-hover"
              }`}
            >
              <input
                className="mt-1 size-4 shrink-0 accent-accent"
                type="radio"
                name="translation-language"
                value={language.code}
                checked={active}
                onChange={() => setSelected(language.code)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">
                    {language.nativeName}
                  </span>
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-muted">
                    {language.sample}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {language.name}
                </span>
              </span>
              {active ? (
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
              ) : null}
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2 text-[12px] leading-relaxed text-hard"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          className={outlineButton}
          type="button"
          disabled={pending !== null}
          onClick={() => void submit(true)}
        >
          {pending === "skip" ? "Menyimpan…" : "Lewati"}
        </button>
        <button
          className={primaryButton}
          type="button"
          disabled={pending !== null}
          onClick={() => void submit(false)}
        >
          {pending === "save" ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </Modal>
  );
}
