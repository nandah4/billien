"use client";

import Image from "next/image";
import { AccountControls } from "@/components/app/account-controls";
import logo from "@/public/assets/logo.png";

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
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src={logo}
            alt=""
            aria-hidden="true"
            sizes="32px"
            priority
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] leading-tight font-semibold text-ink">
              Billien
            </span>
            {/* Phones keep the bar to the name alone; the tagline returns once
                there is room for it. */}
            <span className="hidden truncate text-[10px] leading-tight text-muted sm:block">
              Learn English, one word at a time
            </span>
          </span>
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
