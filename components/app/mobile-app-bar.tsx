"use client";

import { AccountControls } from "@/components/app/account-controls";

/**
 * Mobile app bar: brand on the left, account controls on the right. Fixed to
 * the top edge like a native title bar.
 *
 * The account menu is intentionally absent here: the bottom navigation already
 * links to Profile, which owns sign out, so a second entry point would just add
 * clutter to a 56px bar.
 */
export function MobileAppBar({
  signedIn,
  isSessionPending,
  streak,
  onSignIn,
}: {
  signedIn: boolean;
  isSessionPending: boolean;
  streak: number;
  onSignIn: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-surface lg:hidden">
      <div className="mx-auto flex h-14 w-full max-w-310 items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-tight font-semibold text-ink">
            Billien
          </p>
          <p className="truncate text-[10px] leading-tight text-muted">
            Lexical Mastery Platform
          </p>
        </div>
        <AccountControls
          signedIn={signedIn}
          isSessionPending={isSessionPending}
          sessionLabel=""
          streak={streak}
          actionLoading={false}
          onSignOut={() => {}}
          onSignIn={onSignIn}
          size="md"
          showMenu={false}
        />
      </div>
    </header>
  );
}
