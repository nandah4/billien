"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import helloImage from "@/public/assets/hello.webp";
import logo from "@/public/assets/logo.png";
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
      // The auth service resolves a relative callback against its own base URL,
      // so "/" became the auth host root and the browser landed on a route that
      // does not exist. Resolve against the app origin before sending it.
      const target = new URL(callbackURL, window.location.origin).toString();

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: target,
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
        <Image
          src={logo}
          alt="Billien"
          sizes="28px"
          className="h-7 w-7 object-contain"
        />
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

      <div className="mt-1 flex flex-col items-center text-center">
        <Image
          src={helloImage}
          alt=""
          aria-hidden="true"
          sizes="144px"
          className="h-32 w-auto object-contain sm:h-36"
        />

        <h2
          id="auth-modal-title"
          className="mt-3 text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink"
        >
          Welcome to Billien
        </h2>
        <p
          id="auth-modal-description"
          className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted"
        >
          Sign in with Google to keep your memorised words, translations, and
          daily streak tied to one verified identity.
        </p>
      </div>

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
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  // Mirrors the body's pending state so the overlay and Escape key can decline
  // to dismiss while the Google redirect is in flight.
  const pendingRef = useRef(false);

  useEffect(() => {
    if (open) pendingRef.current = false;
  }, [open]);

  function requestDismiss() {
    if (pendingRef.current) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="auth-modal-title"
      describedBy="auth-modal-description"
      initialFocusRef={primaryRef}
      canDismiss={() => !pendingRef.current}
    >
      <AuthDialogBody
        callbackURL={callbackURL}
        pendingRef={pendingRef}
        primaryRef={primaryRef}
        onDismiss={requestDismiss}
      />
    </Modal>
  );
}
