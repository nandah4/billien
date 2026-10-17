"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Flame,
  Languages,
  LogOut,
  UserRound,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import { LANGUAGES, normalizeLanguage } from "@/lib/language";
import type { UserPreferences } from "@/lib/types";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";

export function ProfileView({
  user,
  preferences,
  summary,
}: {
  user: { name: string; email: string };
  preferences: UserPreferences;
  summary: { savedCount: number; currentStreak: number };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState(() =>
    normalizeLanguage(preferences.translationLanguage),
  );
  const [savedLanguage, setSavedLanguage] = useState(() =>
    normalizeLanguage(preferences.translationLanguage),
  );
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = language !== savedLanguage;

  async function save() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await request<ApiEnvelope<UserPreferences>>(
        "/api/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ translationLanguage: language }),
        },
      );
      queryClient.setQueryData<ApiEnvelope<UserPreferences>>(
        ["preferences"],
        (previous) =>
          previous
            ? { ...previous, data: response.data }
            : { data: response.data },
      );
      // The list projection is language-specific, so it must be refetched.
      await queryClient.invalidateQueries({
        queryKey: ["remembered-words"],
      });
      setSavedLanguage(response.data.translationLanguage);
      setStatus("Language preference saved.");
    } catch (requestError) {
      setError(messageFor(requestError, "Unable to save your preference."));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      queryClient.clear();
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <main className="grid-pattern min-h-dvh bg-canvas px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          href="/"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </Link>

        <header className="mt-4">
          <h1 className="text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
            Profile
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage your translation language and review your learning summary.
          </p>
        </header>

        <div className={`${cardClass} mt-5 p-5 sm:p-6`}>
          <section aria-labelledby="profile-language">
            <div className="flex items-center gap-2">
              <Languages size={16} className="text-accent" aria-hidden="true" />
              <h2
                id="profile-language"
                className="text-[14px] font-semibold text-ink"
              >
                Translation language
              </h2>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              Word details show the meaning in this language.
            </p>

            <div
              className="mt-3 grid gap-2"
              role="radiogroup"
              aria-label="Translation language"
            >
              {LANGUAGES.map((item) => {
                const active = language === item.code;
                return (
                  <label
                    key={item.code}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:bg-hover"
                    }`}
                  >
                    <input
                      className="size-4 shrink-0 accent-accent"
                      type="radio"
                      name="profile-language"
                      value={item.code}
                      checked={active}
                      onChange={() => setLanguage(item.code)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">
                        {item.nativeName}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {item.name} · example: {item.sample}
                      </span>
                    </span>
                    {active ? (
                      <Check
                        size={16}
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
            {status ? (
              <p className="mt-4 text-[12px] text-easy" role="status">
                {status}
              </p>
            ) : null}

            <button
              className={`${primaryButton} mt-4 w-full sm:w-auto`}
              type="button"
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </section>

          <section
            className="mt-6 border-t border-line pt-5"
            aria-labelledby="profile-account"
          >
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-faint" aria-hidden="true" />
              <h2
                id="profile-account"
                className="text-[14px] font-semibold text-ink"
              >
                Account
              </h2>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {user.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-0.5 font-semibold text-ink wrap-anywhere">
                  {user.email || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Saved words</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {summary.savedCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Current streak</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-ink">
                  <Flame size={13} className="text-medium" aria-hidden="true" />
                  {summary.currentStreak}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-6 border-t border-line pt-5">
            <button
              className={outlineButton}
              type="button"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut size={15} aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
