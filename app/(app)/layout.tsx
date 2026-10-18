import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";

/**
 * Layout for the word views. Route groups do not affect the URL, so `/`,
 * `/remembered`, and `/recall` all get the header, bottom navigation, and
 * account dialogs from one place.
 */
export default function WordViewsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
