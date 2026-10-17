"use client";

import Link from "next/link";
import { Bookmark, Compass, LogIn, UserRound } from "lucide-react";
import type { View } from "@/lib/library";

const VIEW_ITEMS: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "discovery", label: "Discovery", icon: Compass },
  { id: "remembered", label: "Remembered", icon: Bookmark },
];

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus";

function ItemBody({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Compass;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <span
        className={`inline-flex h-7 min-w-12 items-center justify-center rounded-full px-3 transition ${
          active ? "bg-accent-soft text-accent" : "text-faint"
        }`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className={active ? "text-accent" : "text-muted"}>{label}</span>
    </>
  );
}

/**
 * Mobile bottom navigation. The third slot is contextual: a signed-in user
 * gets Profile, a guest gets the sign-in entry point, so the bar never leads to
 * a dead end.
 */
export function MobileBottomNav({
  view,
  onChangeView,
  signedIn,
  onSignIn,
}: {
  view: View;
  onChangeView: (view: View) => void;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigasi utama"
    >
      <div className="mx-auto flex w-full max-w-310 items-stretch">
        {VIEW_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              className={itemClass}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChangeView(item.id)}
            >
              <ItemBody icon={item.icon} label={item.label} active={active} />
            </button>
          );
        })}

        {signedIn ? (
          <Link className={itemClass} href="/profile">
            <ItemBody icon={UserRound} label="Profile" active={false} />
          </Link>
        ) : (
          <button className={itemClass} type="button" onClick={onSignIn}>
            <ItemBody icon={LogIn} label="Sign in" active={false} />
          </button>
        )}
      </div>
    </nav>
  );
}
