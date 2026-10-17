"use client";

import { Bookmark, Compass, Flame, LogIn, LogOut, UserRound } from "lucide-react";
import type { View } from "@/lib/library";
import { cardClass, headerOutline, headerPrimary } from "@/lib/ui";

const VIEWS: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "discovery", label: "Discovery", icon: Compass },
  { id: "remembered", label: "Remembered", icon: Bookmark },
];

export function AppHeader({
  view,
  onChangeView,
  signedIn,
  isSessionPending,
  sessionLabel,
  streak,
  actionLoading,
  onSignOut,
  onSignIn,
}: {
  view: View;
  onChangeView: (view: View) => void;
  signedIn: boolean;
  isSessionPending: boolean;
  sessionLabel: string;
  streak: number;
  actionLoading: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  return (
    <header
      className={`${cardClass} flex shrink-0 flex-col gap-3 px-4 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4`}
    >
      <span className="text-[13px] font-semibold text-ink">Billien</span>

      <nav
        className="flex h-9 items-center gap-1 self-start rounded-lg border border-line bg-subtle p-1 lg:justify-self-center lg:self-auto"
        aria-label="Word views"
      >
        {VIEWS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChangeView(item.id)}
            >
              <Icon size={14} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
        {signedIn ? (
          <span
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-medium-soft px-3 text-[11px] font-semibold text-medium"
            title={`${streak} day streak`}
          >
            <Flame size={12} aria-hidden="true" />
            {streak} day streak
          </span>
        ) : null}
        {isSessionPending ? null : signedIn ? (
          <>
            <span
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-subtle px-3 text-[12px] font-semibold text-ink"
              title={`Signed in as ${sessionLabel}`}
            >
              <UserRound
                size={15}
                className="shrink-0 text-faint"
                aria-hidden="true"
              />
              <span className="max-w-35 truncate">{sessionLabel}</span>
            </span>
            <button
              className={headerPrimary}
              type="button"
              disabled={actionLoading}
              onClick={onSignOut}
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </>
        ) : (
          <button className={headerOutline} type="button" onClick={onSignIn}>
            <LogIn size={15} aria-hidden="true" />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
