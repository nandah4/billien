export type View = "discovery" | "remembered";

/** The two word views, in navigation order. `/` is Discovery. */
export const NAV_ITEMS: { id: View; label: string; href: string }[] = [
  { id: "discovery", label: "Discovery", href: "/" },
  { id: "remembered", label: "Remembered", href: "/remembered" },
];

/**
 * Resolves the active view from the current pathname so navigation state has a
 * single source of truth: the URL.
 */
export function viewFromPathname(pathname: string | null): View {
  if (pathname === "/remembered" || pathname?.startsWith("/remembered/")) {
    return "remembered";
  }
  return "discovery";
}
