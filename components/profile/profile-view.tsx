"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Languages,
  LogOut,
  Mail,
  BookMarked,
  UserRound,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { messageFor, request, type ApiEnvelope } from "@/lib/api";
import { LANGUAGES, normalizeLanguage } from "@/lib/language";
import type { UserPreferences } from "@/lib/types";

/** Rows share one height so each grouped card reads as a single table. */
const rowClass =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus";

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      {title ? (
        <h2 className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {title}
        </h2>
      ) : null}
      <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

function RowIcon({ icon: Icon }: { icon: typeof Languages }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
      <Icon size={15} aria-hidden="true" />
    </span>
  );
}

function ValueRow({
  icon,
  label,
  value,
  wrap = false,
}: {
  icon: typeof Languages;
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1 text-[14px] text-ink">{label}</span>
      <span
        className={`max-w-[55%] text-right text-[13px] text-muted ${
          wrap ? "wrap-anywhere" : "truncate"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

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
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = (user.name.trim() || user.email.trim() || "?")
    .charAt(0)
    .toUpperCase();

  // Selecting a language applies immediately, the way an OS settings screen
  // behaves, so there is no separate save button to forget.
  async function selectLanguage(code: string) {
    if (code === language || savingLanguage) return;
    const previous = language;
    setLanguage(code);
    setSavingLanguage(code);
    setStatus(null);
    setError(null);
    try {
      const response = await request<ApiEnvelope<UserPreferences>>(
        "/api/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ translationLanguage: code }),
        },
      );
      queryClient.setQueryData<ApiEnvelope<UserPreferences>>(
        ["preferences"],
        (current) =>
          current
            ? { ...current, data: response.data }
            : { data: response.data },
      );
      // The Remembered list is projected per language, so refetch it.
      await queryClient.invalidateQueries({ queryKey: ["remembered-words"] });
      setStatus("Translation language updated.");
    } catch (requestError) {
      setLanguage(previous);
      setError(messageFor(requestError, "Unable to save your preference."));
    } finally {
      setSavingLanguage(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError(null);
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
    <main className="min-h-dvh bg-canvas pb-10">
      <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-6">
        {/* iOS-style back control: chevron plus a short label. */}
        <Link
          className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-lg pr-2 pl-1 text-accent transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          href="/"
        >
          <ChevronLeft size={22} aria-hidden="true" />
          <span className="text-[15px] font-medium">Back</span>
        </Link>

        {/* Banner with a fixed height; the avatar is centred on its bottom edge. */}
        <div className="relative mt-2">
          <div className="profile-banner h-32 rounded-xl border border-accent-line" />
          <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
            <span
              className="inline-flex size-18 items-center justify-center rounded-full border border-line bg-surface text-[26px] font-semibold text-accent shadow-sm"
              aria-hidden="true"
            >
              {initial}
            </span>
          </div>
        </div>

        <div className="mt-14 text-center">
          <h1 className="text-[20px] leading-tight font-semibold text-ink wrap-anywhere">
            {user.name || "Your account"}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted wrap-anywhere">
            {user.email}
          </p>
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
          <p className="mt-4 text-center text-[12px] text-easy" role="status">
            {status}
          </p>
        ) : null}

        <SectionCard title="Account">
          <ValueRow icon={UserRound} label="Name" value={user.name || "—"} />
          <ValueRow icon={Mail} label="Email" value={user.email || "—"} wrap />
        </SectionCard>

        <SectionCard title="Translation language">
          <div role="radiogroup" aria-label="Translation language">
            {LANGUAGES.map((item) => {
              const active = language === item.code;
              const pending = savingLanguage === item.code;
              return (
                <label
                  key={item.code}
                  className={`${rowClass} cursor-pointer hover:bg-hover ${
                    pending ? "opacity-60" : ""
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="profile-language"
                    value={item.code}
                    checked={active}
                    disabled={savingLanguage !== null}
                    onChange={() => void selectLanguage(item.code)}
                  />
                  <RowIcon icon={Languages} />
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
                  ) : (
                    <ChevronRight
                      size={17}
                      className="shrink-0 text-faint"
                      aria-hidden="true"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Progress">
          <ValueRow
            icon={BookMarked}
            label="Saved words"
            value={String(summary.savedCount)}
          />
          <ValueRow
            icon={Flame}
            label="Current streak"
            value={`${summary.currentStreak} ${
              summary.currentStreak === 1 ? "day" : "days"
            }`}
          />
        </SectionCard>

        <SectionCard>
          <button
            className={`${rowClass} justify-center font-semibold text-hard hover:bg-hard-soft/40 disabled:cursor-not-allowed disabled:opacity-50`}
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="text-[14px]">
              {signingOut ? "Signing out…" : "Sign out"}
            </span>
          </button>
        </SectionCard>
      </div>
    </main>
  );
}
