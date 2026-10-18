"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * shadcn/ui Sonner wrapper. The app has a single light theme, so `theme` is
 * pinned instead of read from `next-themes`.
 *
 * Sonner injects its own stylesheet at runtime, which can land after the app
 * stylesheet and beat the `.toaster` overrides in globals.css. The surface
 * colours are therefore also applied inline, where they always win, while the
 * typography and action styling stay in `classNames`.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-xl)",
          fontSize: "13px",
        },
        classNames: {
          toast: "group toast !border-line !shadow-lg",
          title: "group-[.toast]:font-semibold group-[.toast]:text-ink",
          description: "group-[.toast]:text-[12px] group-[.toast]:text-muted",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:text-[12px] group-[.toast]:font-semibold group-[.toast]:text-surface",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-hover group-[.toast]:text-[12px] group-[.toast]:font-semibold group-[.toast]:text-muted",
          icon: "group-[.toast]:text-accent",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
