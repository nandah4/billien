"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Compass,
  Flame,
  LogIn,
  LogOut,
  MoreHorizontal,
  UserRound,
} from "lucide-react";
import type { View } from "@/lib/library";
import { cardClass, headerOutline } from "@/lib/ui";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // Close on outside press or Escape; Escape returns focus to the trigger.
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function signOut() {
    setMenuOpen(false);
    onSignOut();
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row">
      <header
        className={`${cardClass} flex min-w-0 flex-1 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
      >
        <p className="flex min-w-0 flex-wrap items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Billien</span>
          <span className="text-[13px] text-faint" aria-hidden="true">
            -
          </span>
          <span className="text-[11px] text-muted">
            Lexical Mastery Platform
          </span>
        </p>

        <nav
          className="flex h-9 shrink-0 items-center gap-1 self-start rounded-lg border border-line bg-subtle p-1 sm:self-auto"
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
      </header>

      <header
        className={`${cardClass} relative flex shrink-0 items-center justify-end gap-2 px-4 py-3`}
      >
        {isSessionPending ? (
          // Placeholder keeps the card from collapsing while the session resolves.
          <>
            <span
              className="h-9 w-14 animate-pulse rounded-full bg-subtle"
              aria-hidden="true"
            />
            <span
              className="size-9 animate-pulse rounded-lg bg-subtle"
              aria-hidden="true"
            />
          </>
        ) : signedIn ? (
          <>
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-medium-soft px-3 text-[12px] font-semibold text-medium"
              title={`${streak} day streak`}
              aria-label={`${streak} day streak`}
            >
              <Flame size={13} aria-hidden="true" />
              {streak}
            </span>

            <button
              ref={triggerRef}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="account-menu"
              aria-label="Account menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                ref={menuRef}
                id="account-menu"
                role="menu"
                aria-label="Account"
                className="absolute top-full right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg"
              >
                <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-faint">
                    <UserRound size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-ink">
                      {sessionLabel}
                    </span>
                    <span className="block text-[11px] text-muted">
                      Signed in
                    </span>
                  </span>
                </div>
                <div className="my-1 h-px bg-line" aria-hidden="true" />
                <Link
                  className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-ink transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  href="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound size={15} aria-hidden="true" />
                  Profile
                </Link>
                <div className="my-1 h-px bg-line" aria-hidden="true" />
                <button
                  className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  role="menuitem"
                  disabled={actionLoading}
                  onClick={signOut}
                >
                  <LogOut size={15} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <button className={headerOutline} type="button" onClick={onSignIn}>
            <LogIn size={15} aria-hidden="true" />
            Sign in
          </button>
        )}
      </header>
    </div>
  );
}
