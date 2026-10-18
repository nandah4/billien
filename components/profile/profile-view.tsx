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
import { TodayWordsChart } from "@/components/profile/today-words-chart";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  analyticsQueryOptions,
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

/** One white surface holding one or more labelled groups. */
function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {children}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {title}
      </h2>
      <div className="divide-y divide-line-soft">{children}</div>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const recallStats = useQuery(recallStatsQueryOptions(true));
  const analytics = useQuery(analyticsQueryOptions(true, { preset: "7d" }));

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
            {/* Cover photo and identity share one card: the photo's bottom
                corners and the card's top corners are square, so the two read
                as a single block rather than two stacked panels. */}
            <div className="relative">
              <div className="overflow-hidden rounded-b-xl border border-line bg-surface shadow-sm lg:rounded-xl">
                <div className="relative h-36 w-full sm:h-44">
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

                <div className="px-4 pt-12 pb-5 text-center">
                  <h1 className="text-[20px] leading-tight font-semibold text-ink wrap-anywhere">
                    {user.name || "Your account"}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-muted wrap-anywhere">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Avatar straddles the photo and the identity block. It sits
                  outside the clipping card so its lower half is not cut. */}
              <div className="pointer-events-none absolute inset-x-0 top-36 z-10 flex -translate-y-1/2 justify-center sm:top-44">
                <span
                  className="inline-flex size-18 items-center justify-center rounded-full border border-line bg-surface text-[26px] font-semibold text-accent shadow-sm"
                  aria-hidden="true"
                >
                  {initial}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 px-4 sm:px-6 lg:px-0">
              <GroupCard>
                <div className="grid divide-y divide-line-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <Group title="Account">
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
                  </Group>

                  <Group title="Translation language">
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
                  </Group>
                </div>
              </GroupCard>

              <GroupCard>
                <div className="grid divide-y divide-line-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <Group title="Progress">
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
                  </Group>

                  <Group title="Recall">
                    <ValueRow
                      icon={Brain}
                      label="Due today"
                      value={
                        recallStats.data
                          ? String(recallStats.data.dueToday)
                          : "—"
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
                  </Group>
                </div>
              </GroupCard>

              <GroupCard>
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
              </GroupCard>
            </div>
          </div>

          {/* Right column: today's word count with the week behind it. */}
          <aside className="mt-4 px-4 sm:px-6 lg:sticky lg:top-0 lg:mt-0 lg:px-0">
            <div className="rounded-xl border border-line bg-surface p-4">
              <TodayWordsChart
                series={analytics.data?.series ?? []}
                isLoading={analytics.isLoading}
              />
            </div>
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
