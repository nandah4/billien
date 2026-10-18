"use client";

import { createContext, useContext } from "react";

export type AppShellContextValue = {
  signedIn: boolean;
  isSessionPending: boolean;
  preferredLanguage: string;
  /** Opens the sign-in dialog. Views call this instead of owning the modal. */
  openAuth: () => void;
};

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used inside <AppShell>.");
  }
  return value;
}
