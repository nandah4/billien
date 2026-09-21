"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AuthCard({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signingIn = mode === "sign-in";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const result = signingIn
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name: name.trim(), email, password });
      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("We could not reach the sign-in service. Please try again.");
    } finally { setPending(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand">BILLIEN<span>LEARN ENGLISH, ONE WORD AT A TIME</span></Link>
    <p className="eyebrow">{signingIn ? "Welcome back" : "Create your space"}</p>
    <h1>{signingIn ? "Keep your words close." : "Start your word bank."}</h1>
    <p className="panel-intro">{signingIn ? "Sign in to continue your own remembered words, random flips, and daily streak." : "Your Remembered words, reviews, and streak belong only to your account."}</p>
    <form className="auth-form" onSubmit={submit}>
      {!signingIn && <label>Name<input className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></label>}
      <label>Email<input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input className="input" type="password" autoComplete={signingIn ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
      {error && <p className="error-state" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>{signingIn ? <LogIn size={17} /> : <UserPlus size={17} />}{pending ? "Please wait" : signingIn ? "Sign in" : "Create account"}</button>
    </form>
    <p className="auth-switch">{signingIn ? "New to Billien?" : "Already have an account?"} <Link href={signingIn ? `/auth/sign-up?next=${encodeURIComponent(next)}` : `/auth/sign-in?next=${encodeURIComponent(next)}`}>{signingIn ? "Create an account" : "Sign in"} <ArrowRight size={14} /></Link></p>
  </section></main>;
}
