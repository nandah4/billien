export type View = "discovery" | "remembered" | "recall";

/** The word views, in navigation order. `/` is Discovery. */
export const NAV_ITEMS: { id: View; label: string; href: string }[] = [
  { id: "discovery", label: "Discovery", href: "/" },
  { id: "remembered", label: "Remembered", href: "/remembered" },
  { id: "recall", label: "Recall", href: "/recall" },
];

/**
 * Resolves the active view from the current pathname so navigation state has a
 * single source of truth: the URL. Routes that are not one of the three views
 * (`/analytics`, for example) return `null`, so no tab is marked active.
 */
export function viewFromPathname(pathname: string | null): View | null {
  if (!pathname) return null;
  if (pathname === "/remembered" || pathname.startsWith("/remembered/")) {
    return "remembered";
  }
  if (pathname === "/recall" || pathname.startsWith("/recall/")) {
    return "recall";
  }
  if (pathname === "/") return "discovery";
  return null;
}
