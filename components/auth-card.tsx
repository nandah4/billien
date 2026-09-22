"use client";

import Link from "next/link";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AuthCard({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true); setError(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: next });
      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }
    } catch {
      setError("We could not reach Google sign-in. Please try again.");
    } finally { setPending(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand">BILLIEN<span>LEARN ENGLISH, ONE WORD AT A TIME</span></Link>
    <p className="eyebrow">Verified learning space</p>
    <h1>Keep your words close.</h1>
    <p className="panel-intro">Continue with your Google account to keep Remembered words, random flips, and daily streak tied to one verified identity.</p>
    <div className="auth-form">
      {error && <p className="error-state" role="alert">{error}</p>}
      <button className="primary-button" type="button" disabled={pending} onClick={() => void signInWithGoogle()}><LogIn size={17} />{pending ? "Redirecting to Google…" : "Continue with Google"}</button>
    </div>
  </section></main>;
}
