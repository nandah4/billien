"use client";

import Link from "next/link";
import { Flame, LogIn, LogOut, MoreHorizontal, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { headerOutline } from "@/lib/ui";

/**
 * Streak badge, account menu, and the guest sign-in button. Shared by the
 * desktop header and the mobile app bar so both stay in sync; `size` only
 * changes the control heights (mobile keeps a comfortable touch target).
 *
 * The menu itself is the shadcn/ui Dropdown Menu, which brings focus
 * management, Escape handling, outside-click dismissal, and keyboard
 * navigation for free.
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
  showMenu = true,
}: {
  signedIn: boolean;
  isSessionPending: boolean;
  sessionLabel: string;
  streak: number;
  actionLoading: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
  size?: "sm" | "md";
  /**
   * The mobile app bar hides the menu because the bottom navigation already
   * links to Profile, which owns sign out. Guests still get a sign-in button.
   */
  showMenu?: boolean;
}) {
  if (isSessionPending) {
    // Placeholder keeps the bar from collapsing while the session resolves.
    const placeholder = size === "md" ? "size-10" : "size-9";
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <span
          className={`${placeholder} w-14 animate-pulse rounded-full bg-subtle`}
        />
        {showMenu ? (
          <span
            className={`${placeholder} animate-pulse rounded-lg bg-subtle`}
          />
        ) : null}
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
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex ${control} items-center gap-1.5 rounded-full bg-streak-soft px-3 text-[12px] font-semibold text-streak`}
        title={`${streak} day streak`}
        aria-label={`${streak} day streak`}
      >
        <Flame size={13} aria-hidden="true" />
        {streak}
      </span>

      {showMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`inline-flex ${iconButton} items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-hover hover:text-ink data-[state=open]:bg-hover data-[state=open]:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
            aria-label="Account menu"
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="py-2.5 normal-case tracking-normal">
              <span className="block truncate text-[12px] font-semibold text-ink">
                Hi, <span className="capitalize">{sessionLabel}</span> 👋🏻
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-normal text-muted">
                Ready for today&apos;s lesson?
              </span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound size={15} aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              tone="danger"
              disabled={actionLoading}
              onSelect={() => onSignOut()}
            >
              <LogOut size={15} aria-hidden="true" />
              {actionLoading ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
