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

/**
 * Routes that supply their own top header instead of the app bar. They are
 * secondary pages reached from a menu, so a back control plus a title reads
 * better than a bar whose brand block repeats the chrome above it.
 */
const HEADER_OWNED_ROUTES = ["/analytics"];

export function ownsHeader(pathname: string | null): boolean {
  if (!pathname) return false;
  return HEADER_OWNED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Routes whose first block runs edge to edge under the mobile app bar, like a
 * profile cover photo. The shell drops the gap and the extra breathing room for
 * these, so the block can start at the bar's edge without negative margins.
 */
const BLEED_TOP_ROUTES = ["/profile"];

export function bleedsTop(pathname: string | null): boolean {
  if (!pathname) return false;
  return BLEED_TOP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
