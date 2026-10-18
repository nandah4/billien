"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  Brain,
  ChartColumn,
  ChevronRight,
  Flame,
  Languages,
  LogOut,
  Mail,
  Target,
  UserRound,
} from "lucide-react";
import { LanguagePickerModal } from "@/components/preferences/language-picker-modal";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  messageFor,
  recallStatsQueryOptions,
  request,
  type ApiEnvelope,
} from "@/lib/api";
import { LANGUAGES, normalizeLanguage } from "@/lib/language";
import type { UserPreferences } from "@/lib/types";
import bannerImage from "@/public/assets/banner.webp";

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
    <section>
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

const STAT_TONES = {
  accent: "text-accent",
  medium: "text-medium",
  easy: "text-easy",
  muted: "text-ink",
} as const;

/** One number in the "Today" panel. */
function QuickStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className="rounded-lg border border-line bg-subtle px-3 py-2.5">
      <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-[20px] leading-tight font-semibold tabular-nums ${STAT_TONES[tone]}`}
      >
        {value}
      </dd>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const recallStats = useQuery(recallStatsQueryOptions(true));

  const activeLanguage =
    LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  const initial = (user.name.trim() || user.email.trim() || "?")
    .charAt(0)
    .toUpperCase();

  // Selecting a language applies immediately, the way an OS settings screen
  // behaves. The dialog stays open until the request settles so a failure is
  // reported where the choice was made.
  async function selectLanguage(code: string) {
    if (code === language || savingLanguage) return;
    const previous = language;
    setLanguage(code);
    setSavingLanguage(code);
    setPickerError(null);
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
      toast.success("Translation language updated.");
      setPickerOpen(false);
    } catch (requestError) {
      setLanguage(previous);
      setPickerError(
        messageFor(requestError, "Unable to save your preference."),
      );
    } finally {
      setSavingLanguage(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      // `signOut` reports transport and API failures two ways: by throwing and
      // by resolving with `error`. Both must be treated as a failure, otherwise
      // a rejected sign-out looks successful and the user stays signed in.
      const { error } = await authClient.signOut();
      if (error) throw error;
      queryClient.clear();
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <main className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      {/* The wrapper cancels the shell padding so the cover photo can run edge
          to edge on phones; the inner blocks add it back where they need it. */}
      <div className="-mx-4 pb-6 sm:-mx-6 lg:mx-0 lg:pb-2">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-6">
          <div className="min-w-0">
            <div className="relative">
              {/* Cover photo. Full bleed below lg, a card above it. */}
              <div className="relative h-36 w-full overflow-hidden bg-ink sm:h-44 lg:rounded-xl lg:shadow-sm">
                <Image
                  src={bannerImage}
                  alt=""
                  aria-hidden="true"
                  fill
                  priority
                  sizes="(min-width: 1024px) 640px, 100vw"
                  className="object-cover object-center"
                />
                <div
                  className="absolute inset-0 bg-black/55"
                  aria-hidden="true"
                />
              </div>

              {/* Avatar straddles the cover and the identity card below it. */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 justify-center">
                <span
                  className="inline-flex size-18 items-center justify-center rounded-full border border-line bg-surface text-[26px] font-semibold text-accent shadow-sm"
                  aria-hidden="true"
                >
                  {initial}
                </span>
              </div>
            </div>

            {/* Identity card: the name and email sit on their own surface so
                they read as content rather than floating on the canvas. */}
            <div className="mx-4 rounded-xl border border-line bg-surface px-4 pt-12 pb-5 text-center sm:mx-6 lg:mx-0">
              <h1 className="text-[20px] leading-tight font-semibold text-ink wrap-anywhere">
                {user.name || "Your account"}
              </h1>
              <p className="mt-0.5 text-[13px] text-muted wrap-anywhere">
                {user.email}
              </p>
            </div>

            {/* Sections pair up once the column is wide enough. */}
            <div className="mx-4 mt-5 grid gap-5 sm:mx-6 sm:grid-cols-2 lg:mx-0">
              <SectionCard title="Account">
                <ValueRow
                  icon={UserRound}
                  label="Name"
                  value={user.name || "—"}
                />
                <ValueRow
                  icon={Mail}
                  label="Email"
                  value={user.email || "—"}
                  wrap
                />
              </SectionCard>

              <SectionCard title="Translation language">
                <button
                  className={`${rowClass} hover:bg-hover`}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setPickerError(null);
                    setPickerOpen(true);
                  }}
                >
                  <RowIcon icon={Languages} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-ink">
                      {activeLanguage.nativeName}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {activeLanguage.name} · {activeLanguage.sample}
                    </span>
                  </span>
                  <ChevronRight
                    size={17}
                    className="shrink-0 text-faint"
                    aria-hidden="true"
                  />
                </button>
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

              <SectionCard title="Recall">
                <ValueRow
                  icon={Brain}
                  label="Due today"
                  value={
                    recallStats.data ? String(recallStats.data.dueToday) : "—"
                  }
                />
                <ValueRow
                  icon={Target}
                  label="Accuracy (7 days)"
                  value={
                    recallStats.data
                      ? `${Math.round(recallStats.data.accuracy7d * 100)}%`
                      : "—"
                  }
                />
                <Link
                  className={`${rowClass} justify-center font-semibold text-accent hover:bg-accent-soft`}
                  href="/recall"
                >
                  <Brain size={16} aria-hidden="true" />
                  <span className="text-[14px]">Start practising</span>
                </Link>
              </SectionCard>

              <SectionCard title="Insights">
                <Link
                  className={`${rowClass} hover:bg-hover`}
                  href="/analytics"
                >
                  <RowIcon icon={ChartColumn} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-ink">
                      Analytics
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      Daily and monthly activity
                    </span>
                  </span>
                  <ChevronRight
                    size={17}
                    className="shrink-0 text-faint"
                    aria-hidden="true"
                  />
                </Link>
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
          </div>

          {/* Right column: today at a glance. Sticky so it stays in view while
              the settings column scrolls. */}
          <aside className="mx-4 mt-5 sm:mx-6 lg:mx-0 lg:mt-0 lg:sticky lg:top-0">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Today
              </h2>

              <dl className="mt-3 grid grid-cols-2 gap-2">
                <QuickStat
                  label="Due now"
                  value={
                    recallStats.data ? String(recallStats.data.dueToday) : "—"
                  }
                  tone="accent"
                />
                <QuickStat
                  label="Streak"
                  value={`${summary.currentStreak}d`}
                  tone="medium"
                />
                <QuickStat
                  label="Accuracy"
                  value={
                    recallStats.data
                      ? `${Math.round(recallStats.data.accuracy7d * 100)}%`
                      : "—"
                  }
                  tone="easy"
                />
                <QuickStat
                  label="Saved"
                  value={String(summary.savedCount)}
                  tone="muted"
                />
              </dl>

              <Link
                className={`${rowClass} mt-3 justify-center rounded-lg border border-line bg-surface font-semibold text-accent hover:bg-accent-soft`}
                href="/recall"
              >
                <Brain size={16} aria-hidden="true" />
                <span className="text-[13px]">Practise now</span>
              </Link>
            </section>
          </aside>
        </div>
      </div>

      <LanguagePickerModal
        open={pickerOpen}
        current={language}
        saving={savingLanguage}
        error={pickerError}
        onSelect={(code) => void selectLanguage(code)}
        onClose={() => setPickerOpen(false)}
      />
    </main>
  );
}
