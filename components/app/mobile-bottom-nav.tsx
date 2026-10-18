"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, LogIn, UserRound } from "lucide-react";
import { NAV_ITEMS, viewFromPathname, type View } from "@/lib/navigation";

const ICONS: Record<View, typeof Compass> = {
  discovery: Compass,
  remembered: Bookmark,
};

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
  signedIn,
  onSignIn,
}: {
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const view = viewFromPathname(usePathname());

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex w-full max-w-310 items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <Link
              key={item.id}
              className={itemClass}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              <ItemBody
                icon={ICONS[item.id]}
                label={item.label}
                active={active}
              />
            </Link>
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
