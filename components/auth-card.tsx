"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path className="fill-google-blue" d="M21.8 12.23c0-.71-.06-1.23-.2-1.77H12v3.55h5.64c-.11.88-.73 2.2-2.1 3.1l-.02.12 3.06 2.37.21.02c1.94-1.79 3.01-4.42 3.01-7.39Z" />
    <path className="fill-google-green" d="M12 22c2.76 0 5.08-.91 6.78-2.38l-3.23-2.51c-.86.6-2.02 1.02-3.55 1.02a6.16 6.16 0 0 1-5.83-4.26l-.11.01-3.18 2.47-.04.1A10.25 10.25 0 0 0 12 22Z" />
    <path className="fill-google-yellow" d="M6.17 13.87A6.38 6.38 0 0 1 5.85 12c0-.65.12-1.28.31-1.87v-.13L2.95 7.5l-.1.05A10.23 10.23 0 0 0 1.75 12c0 1.64.39 3.19 1.1 4.45l3.32-2.58Z" />
    <path className="fill-google-red" d="M12 5.87c1.93 0 3.23.84 3.97 1.54l2.9-2.83C17.07 2.91 14.76 2 12 2a10.25 10.25 0 0 0-9.15 5.55l3.31 2.58A6.18 6.18 0 0 1 12 5.87Z" />
  </svg>;
}

export function AuthCard({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: next });
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

  return <main className="grid min-h-dvh place-items-center overflow-auto p-5">
    <section className="w-full max-w-[460px] rounded-[6px] border-2 border-line bg-surface p-[clamp(22px,5vw,40px)]">
      <Link href="/" className="mb-[38px] inline-block font-[var(--font-geist-mono)] text-[1.55rem] font-black tracking-[-0.08em] no-underline">
        BILLIEN
        <span className="mt-[7px] block text-[0.58rem] font-bold tracking-[0.11em] text-muted">LEARN ENGLISH, ONE WORD AT A TIME</span>
      </Link>
      <p className="mb-[7px] text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-muted">Verified learning space</p>
      <h1 className="m-0 font-[var(--font-geist-mono)] text-[clamp(1.55rem,4.6vw,2.1rem)] font-bold tracking-[-0.08em]">Keep your words close.</h1>
      <p className="mb-5 mt-2 max-w-[620px] leading-[1.5] text-muted">Continue with your Google account to keep Remembered words, random flips, and daily streak tied to one verified identity.</p>
      <div className="mt-[22px] grid gap-4">
        {error && <p className="m-0 rounded-[6px] border-2 border-danger bg-danger-soft px-3 py-2.5 text-[0.8rem] leading-[1.55] text-danger" role="alert">{error}</p>}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-[6px] border-2 border-line bg-ink px-3.5 py-2.5 font-extrabold text-surface transition hover:-translate-y-0.5 hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-focus" type="button" disabled={pending} onClick={() => void signInWithGoogle()}>
          <GoogleMark />
          {pending ? "Redirecting to Google…" : "Continue with Google"}
        </button>
      </div>
    </section>
  </main>;
}
