"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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

export function AuthCard({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
      });
      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }
    } catch {
      setError("We could not reach Google sign-in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-auto bg-canvas p-5">
      <section className="w-full max-w-[440px] rounded-xl border border-line bg-surface p-[clamp(22px,5vw,36px)] shadow-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[13px] font-semibold text-ink no-underline"
        >
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          Billien
        </Link>
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-faint uppercase">
          Verified learning space
        </p>
        <h1 className="m-0 text-[clamp(1.4rem,4.4vw,1.75rem)] leading-tight font-bold tracking-[-0.02em]">
          Keep your words close.
        </h1>
        <p className="mt-3 mb-5 text-[13px] leading-relaxed text-muted">
          Continue with your Google account to keep memorised words, drills, and
          your daily streak tied to one verified identity.
        </p>
        <div className="mt-6 grid gap-4">
          {error && (
            <p
              className="m-0 rounded-lg border border-hard-soft bg-hard-soft/50 px-3 py-2.5 text-[12px] leading-relaxed text-hard"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            disabled={pending}
            onClick={() => void signInWithGoogle()}
          >
            <GoogleMark />
            {pending ? "Redirecting to Google…" : "Continue with Google"}
          </button>
        </div>
      </section>
    </main>
  );
}
