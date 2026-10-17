"use client";

import { AccountControls } from "@/components/app/account-controls";

/**
 * Mobile app bar: brand on the left, account controls on the right. Fixed to
 * the top edge like a native title bar; the desktop header is hidden below
 * `lg` and the bottom navigation owns view switching there.
 */
export function MobileAppBar({
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
          sessionLabel={sessionLabel}
          streak={streak}
          actionLoading={actionLoading}
          onSignOut={onSignOut}
          onSignIn={onSignIn}
          size="md"
        />
      </div>
    </header>
  );
}
