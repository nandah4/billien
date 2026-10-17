"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. The server snapshot is always `false`, which
 * matches the mobile-first markup; nothing renders differently until the client
 * has measured the viewport.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Matches the `lg` breakpoint used throughout the layout. */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 64rem)");
}
