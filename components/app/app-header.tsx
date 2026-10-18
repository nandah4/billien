"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Brain, Compass } from "lucide-react";
import { AccountControls } from "@/components/app/account-controls";
import { MobileAppBar } from "@/components/app/mobile-app-bar";
import { NAV_ITEMS, viewFromPathname, type View } from "@/lib/navigation";
import { cardClass } from "@/lib/ui";

const ICONS: Record<View, typeof Compass> = {
  discovery: Compass,
  remembered: Bookmark,
  recall: Brain,
};

/**
 * Desktop chrome: two cards, brand plus the view switcher on the left and the
 * account controls on the right. Below `lg` the mobile app bar and bottom
 * navigation take over, so this is hidden entirely.
 */
export function AppHeader({
  signedIn,
  isSessionPending,
  sessionLabel,
  streak,
  actionLoading,
  onSignOut,
  onSignIn,
}: {
  signedIn: boolean;
  isSessionPending: boolean;
  sessionLabel: string;
  streak: number;
  actionLoading: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  const view = viewFromPathname(usePathname());

  return (
    <>
      <MobileAppBar
        signedIn={signedIn}
        isSessionPending={isSessionPending}
        streak={streak}
        onSignIn={onSignIn}
      />

      <div className="hidden shrink-0 flex-col gap-3 lg:flex lg:flex-row">
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
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.id];
              const active = view === item.id;
              return (
                <Link
                  key={item.id}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    active
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={14} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <header
          className={`${cardClass} flex shrink-0 items-center justify-end px-4 py-3`}
        >
          <AccountControls
            signedIn={signedIn}
            isSessionPending={isSessionPending}
            sessionLabel={sessionLabel}
            streak={streak}
            actionLoading={actionLoading}
            onSignOut={onSignOut}
            onSignIn={onSignIn}
          />
        </header>
      </div>
    </>
  );
}
