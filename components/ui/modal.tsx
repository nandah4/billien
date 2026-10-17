"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog shell: overlay, panel, scroll lock, focus trap, Escape, focus
 * restoration. `canDismiss` lets a caller keep the dialog open while a redirect
 * is in flight.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  label,
  describedBy,
  initialFocusRef,
  canDismiss,
  maxWidthClass = "max-w-105",
  panelClassName = "p-6",
  overlayClassName = "p-4",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  canDismiss?: () => boolean;
  maxWidthClass?: string;
  panelClassName?: string;
  /** Lets a caller offset the dialog from fixed chrome, e.g. a bottom nav. */
  overlayClassName?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const canDismissRef = useRef(canDismiss);

  // Keep the latest handlers without re-running the open/close effect, so the
  // scroll lock and focus restoration are not reset on every parent render.
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    canDismissRef.current = canDismiss;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!canDismissRef.current || canDismissRef.current()) {
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, initialFocusRef]);

  function requestClose() {
    if (canDismissRef.current && !canDismissRef.current()) return;
    onCloseRef.current();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${overlayClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <motion.div
            ref={panelRef}
            className={`w-full ${maxWidthClass} rounded-xl border border-line bg-surface ${panelClassName} shadow-xl outline-none`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            aria-describedby={describedBy}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
