"use client";

import { AlertCircle, RefreshCw, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import emptyImage from "@/public/assets/empty.png";
import helloImage from "@/public/assets/hello.webp";

/** Placeholder that keeps the card height stable while a session loads. */
export function RecallSkeleton() {
  return (
    <div
      className={`${cardClass} mx-auto w-full max-w-2xl p-5 sm:p-6`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading a recall session…</span>
      <div className="h-2.5 w-24 animate-pulse rounded-full bg-subtle" />
      <div className="mt-4 h-1 w-full rounded-full bg-subtle" />
      <div className="mt-6 h-2.5 w-16 animate-pulse rounded-full bg-subtle" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-subtle" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded-full bg-subtle" />
      <div className="mt-6 h-11 w-full animate-pulse rounded-lg bg-subtle" />
      <div className="mt-4 h-10 w-32 animate-pulse rounded-lg bg-subtle" />
    </div>
  );
}

export function RecallGuestState({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-6`}>
      <EmptyState
        image={helloImage}
        title="Sign in to practise"
        description="Recall trains the words you have already saved, so it needs your account."
        action={
          <button className={primaryButton} type="button" onClick={onSignIn}>
            Sign in
          </button>
        }
      />
    </div>
  );
}

/**
 * Gate shown when fewer than ten saved words can produce a card. It also
 * offers a repair action, because a word with empty entries is a data gap the
 * app can usually close on demand.
 */
export function RecallGateState({
  eligibleCount,
  librarySize,
  ineligibleCount,
  minSessionSize,
  onGoToDiscovery,
  onRepair,
  repairing,
  repairMessage,
}: {
  eligibleCount: number;
  librarySize: number;
  ineligibleCount: number;
  minSessionSize: number;
  onGoToDiscovery: () => void;
  onRepair: () => void;
  repairing: boolean;
  repairMessage: string | null;
}) {
  const remaining = Math.max(0, minSessionSize - eligibleCount);

  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-6`}>
      <EmptyState
        image={emptyImage}
        title="Save a few more words first"
        description={`A session needs at least ${minSessionSize} words that can become cards. You have ${eligibleCount} of ${librarySize} saved.`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button
              className={primaryButton}
              type="button"
              onClick={onGoToDiscovery}
            >
              Find words
            </button>
            {ineligibleCount > 0 ? (
              <button
                className={outlineButton}
                type="button"
                disabled={repairing}
                onClick={onRepair}
              >
                <Wrench size={14} aria-hidden="true" />
                {repairing ? "Fixing…" : `Fix ${ineligibleCount} words`}
              </button>
            ) : null}
          </div>
        }
      />
      <p className="mt-3 text-center text-[12px] text-muted">
        {remaining > 0
          ? `${remaining} more ${remaining === 1 ? "word" : "words"} needed.`
          : "Ready to start."}
      </p>
      {repairMessage ? (
        <p className="mt-2 text-center text-[12px] text-muted" role="status">
          {repairMessage}
        </p>
      ) : null}
    </div>
  );
}

export function RecallCaughtUpState({
  canPractiseAll,
  onPractiseAll,
}: {
  canPractiseAll: boolean;
  onPractiseAll: () => void;
}) {
  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-6`}>
      <EmptyState
        image={emptyImage}
        title={
          canPractiseAll ? "Nothing due right now" : "Nothing to practise yet"
        }
        description={
          canPractiseAll
            ? "Every word is scheduled for later. You can still run a session over the whole library."
            : "Your saved words need a translation, definition, or example before they can become cards."
        }
        action={
          canPractiseAll ? (
            <button
              className={outlineButton}
              type="button"
              onClick={onPractiseAll}
            >
              Practise all words
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

export function RecallErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className={`${cardClass} mx-auto w-full max-w-2xl p-5 sm:p-6`}>
      <div
        className="flex items-start gap-2 rounded-lg border border-hard-soft bg-hard-soft/40 p-3"
        role="alert"
      >
        <AlertCircle
          size={16}
          className="mt-0.5 shrink-0 text-hard"
          aria-hidden="true"
        />
        <p className="text-[12px] leading-relaxed text-hard">{message}</p>
      </div>
      <button
        className={`${outlineButton} mt-4`}
        type="button"
        onClick={onRetry}
      >
        <RefreshCw size={14} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
