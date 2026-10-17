"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, LogIn, LogOut, MoreHorizontal, UserRound } from "lucide-react";
import { headerOutline } from "@/lib/ui";

/**
 * Streak badge, account menu, and the guest sign-in button. Shared by the
 * desktop header and the mobile app bar so both stay in sync; `size` only
 * changes the control heights (mobile keeps a comfortable touch target).
 */
export function AccountControls({
  signedIn,
  isSessionPending,
  sessionLabel,
  streak,
  actionLoading,
  onSignOut,
  onSignIn,
  size = "sm",
}: {
  signedIn: boolean;
  isSessionPending: boolean;
  sessionLabel: string;
  streak: number;
  actionLoading: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
  size?: "sm" | "md";
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

  if (isSessionPending) {
    // Placeholder keeps the bar from collapsing while the session resolves.
    const placeholder = size === "md" ? "size-10" : "size-9";
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <span
          className={`${placeholder} w-14 animate-pulse rounded-full bg-subtle`}
        />
        <span className={`${placeholder} animate-pulse rounded-lg bg-subtle`} />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <button
        className={`${headerOutline} ${size === "md" ? "h-10" : ""}`}
        type="button"
        onClick={onSignIn}
      >
        <LogIn size={15} aria-hidden="true" />
        Sign in
      </button>
    );
  }

  const control = size === "md" ? "h-10" : "h-9";
  const iconButton = size === "md" ? "size-10" : "size-9";

  return (
    <div className="relative flex items-center gap-2">
      <span
        className={`inline-flex ${control} items-center gap-1.5 rounded-full bg-medium-soft px-3 text-[12px] font-semibold text-medium`}
        title={`${streak} day streak`}
        aria-label={`${streak} day streak`}
      >
        <Flame size={13} aria-hidden="true" />
        {streak}
      </span>

      <button
        ref={triggerRef}
        className={`inline-flex ${iconButton} items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
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
              <span className="block text-[11px] text-muted">Signed in</span>
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
    </div>
  );
}
