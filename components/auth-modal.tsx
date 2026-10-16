"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="fill-google-blue"
        d="M21.8 12.23c0-.71-.06-1.23-.2-1.77H12v3.55h5.64c-.11.88-.73 2.2-2.1 3.1l-.02.12 3.06 2.37.21.02c1.94-1.79 3.01-4.42 3.01-7.39Z"
      />
      <path
        className="fill-google-green"
        d="M12 22c2.76 0 5.08-.91 6.78-2.38l-3.23-2.51c-.86.6-2.02 1.02-3.55 1.02a6.16 6.16 0 0 1-5.83-4.26l-.11.01-3.18 2.47-.04.1A10.25 10.25 0 0 0 12 22Z"
      />
      <path
        className="fill-google-yellow"
        d="M6.17 13.87A6.38 6.38 0 0 1 5.85 12c0-.65.12-1.28.31-1.87v-.13L2.95 7.5l-.1.05A10.23 10.23 0 0 0 1.75 12c0 1.64.39 3.19 1.1 4.45l3.32-2.58Z"
      />
      <path
        className="fill-google-red"
        d="M12 5.87c1.93 0 3.23.84 3.97 1.54l2.9-2.83C17.07 2.91 14.76 2 12 2a10.25 10.25 0 0 0-9.15 5.55l3.31 2.58A6.18 6.18 0 0 1 12 5.87Z"
      />
    </svg>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog contents. Rendered only while the modal is open, so the error and
 * pending state reset on close without an effect that writes state.
 */
function AuthDialogBody({
  callbackURL,
  pendingRef,
  primaryRef,
  onDismiss,
}: {
  callbackURL: string;
  pendingRef: RefObject<boolean>;
  primaryRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
      }
      // On success the browser navigates to Google next.
    } catch {
      setError("We could not reach Google sign-in. Please try again.");
    } finally {
      // Always release the guard. If the browser never navigates (blocked
      // redirect, offline), the dialog must remain dismissable.
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          Billien
        </span>
        <button
          className="-mt-1 -mr-1 inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          disabled={pending}
          onClick={onDismiss}
          aria-label="Close the sign-in dialog"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <h2
        id="auth-modal-title"
        className="mt-4 text-[20px] leading-tight font-bold tracking-[-0.02em]"
      >
        Keep your words close.
      </h2>
      <p
        id="auth-modal-description"
        className="mt-2 text-[13px] leading-relaxed text-muted"
      >
        Sign in with Google to keep your memorised words, drill results, and
        daily streak tied to one verified identity.
      </p>

      <div className="mt-5 grid gap-3">
        {error ? (
          <p
            className="m-0 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2.5 text-[12px] leading-relaxed text-hard"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <button
          ref={primaryRef}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          disabled={pending}
          onClick={() => void signInWithGoogle()}
        >
          <GoogleMark />
          {pending ? "Redirecting to Google…" : "Continue with Google"}
        </button>
      </div>
    </>
  );
}

export function AuthModal({
  open,
  onClose,
  callbackURL = "/",
}: {
  open: boolean;
  onClose: () => void;
  callbackURL?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  // Mirrors the body's pending state so the overlay and Escape key can decline
  // to dismiss while the Google redirect is in flight.
  const pendingRef = useRef(false);
  // Keep the latest handler without re-running the open/close effect, so focus
  // and the scroll lock are not reset on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  function requestDismiss() {
    if (pendingRef.current) return;
    onCloseRef.current();
  }

  useEffect(() => {
    if (!open) return;

    // A previous attempt may have left this set; never open in a locked state.
    pendingRef.current = false;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!pendingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Keep focus inside the dialog while it is open.
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
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) requestDismiss();
          }}
        >
          <motion.div
            ref={panelRef}
            className="w-full max-w-105 rounded-xl border border-line bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            aria-describedby="auth-modal-description"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <AuthDialogBody
              callbackURL={callbackURL}
              pendingRef={pendingRef}
              primaryRef={primaryRef}
              onDismiss={requestDismiss}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
