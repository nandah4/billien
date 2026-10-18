"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, RefreshCw } from "lucide-react";
import {
  ActivityChart,
  AccuracyChart,
} from "@/components/analytics/analytics-charts";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { AnalyticsTable } from "@/components/analytics/analytics-table";
import { useAppShell } from "@/components/app/app-shell-context";
import { EmptyState } from "@/components/ui/empty-state";
import { analyticsQueryOptions, messageFor } from "@/lib/api";
import { formatBucket, formatPercent } from "@/lib/analytics/format";
import { DEFAULT_PRESET } from "@/lib/analytics/range";
import type { AnalyticsPreset, Granularity } from "@/lib/analytics/types";
import { cardClass, outlineButton, primaryButton } from "@/lib/ui";
import helloImage from "@/public/assets/hello.webp";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-subtle px-3 py-2.5">
      <dt className="text-[10px] font-semibold tracking-wider text-faint uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[18px] leading-tight font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={`${cardClass} p-5`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading analytics…</span>
      <div className="h-2.5 w-24 animate-pulse rounded-full bg-subtle" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-lg bg-subtle"
          />
        ))}
      </div>
      <div className="mt-4 h-[240px] animate-pulse rounded-lg bg-subtle" />
    </div>
  );
}

/**
 * `/analytics` — activity and recall metrics for a chosen window. The range and
 * granularity live in component state; the server owns the date arithmetic.
 */
export function AnalyticsView() {
  const { signedIn, isSessionPending, openAuth } = useAppShell();

  const [preset, setPreset] = useState<AnalyticsPreset>(DEFAULT_PRESET);
  const [month, setMonth] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity | null>(null);

  const query = useQuery(
    analyticsQueryOptions(signedIn, { preset, month, granularity }),
  );

  const back = (
    <Link
      className="inline-flex h-8 items-center gap-0.5 rounded-lg pr-2 pl-1 text-[13px] font-medium text-accent transition hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      href="/profile"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      Profile
    </Link>
  );

  if (isSessionPending) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        {back}
        <div className="mt-2">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className={`${cardClass} mx-auto w-full max-w-3xl p-6`}>
        <EmptyState
          image={helloImage}
          title="Sign in to see your analytics"
          description="Activity and recall metrics are tied to your account."
          action={
            <button className={primaryButton} type="button" onClick={openAuth}>
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  const data = query.data;
  const rangeLabel = data
    ? `${formatBucket(data.range.from, "day")} – ${formatBucket(
        data.range.to,
        "day",
      )}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <h1 className="text-[16px] font-semibold text-ink">Analytics</h1>
        <span className="text-[11px] text-muted">{rangeLabel}</span>
      </div>

      <div className={`${cardClass} p-4`}>
        <AnalyticsFilters
          preset={preset}
          month={month}
          granularity={granularity}
          disabled={query.isFetching}
          onPreset={(next) => {
            setPreset(next);
            setMonth(null);
          }}
          onMonth={setMonth}
          onGranularity={setGranularity}
        />
      </div>

      {query.isLoading ? <Skeleton /> : null}

      {query.isError ? (
        <div className={`${cardClass} p-5`}>
          <div
            className="rounded-lg border border-hard-soft bg-hard-soft/40 p-3"
            role="alert"
          >
            <p className="text-[12px] leading-relaxed text-hard">
              {messageFor(query.error, "Unable to load analytics.")}
            </p>
          </div>
          <button
            className={`${outlineButton} mt-3`}
            type="button"
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Words added" value={String(data.totals.wordsAdded)} />
            <Stat label="Reviews" value={String(data.totals.reviews)} />
            <Stat
              label="Recall sessions"
              value={String(data.totals.recallSessions)}
            />
            <Stat
              label="Accuracy"
              value={formatPercent(data.totals.recallAccuracy)}
            />
          </dl>

          <div className={`${cardClass} flex flex-wrap gap-2 px-4 py-3`}>
            <span className="text-[11px] font-semibold tracking-wider text-faint uppercase">
              Streak
            </span>
            <span className="text-[12px] text-ink">
              {data.streak.current} {data.streak.current === 1 ? "day" : "days"}{" "}
              current
            </span>
            <span className="text-[12px] text-muted">
              · {data.streak.longest} best
            </span>
          </div>

          {data.totals.wordsAdded === 0 &&
          data.totals.reviews === 0 &&
          data.totals.recallSessions === 0 ? (
            <div className={`${cardClass} p-6`}>
              <EmptyState
                image={helloImage}
                title="No activity in this range"
                description="Save a word or run a recall session, then come back. Try a wider range if you were active earlier."
              />
            </div>
          ) : (
            <>
              <section className={`${cardClass} p-4`}>
                <h2 className="text-[12px] font-semibold text-ink">
                  Words added and reviews
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Per {data.range.granularity === "month" ? "month" : "day"}, in{" "}
                  {data.range.timeZone}.
                </p>
                <div className="mt-3">
                  <ActivityChart
                    series={data.series}
                    granularity={data.range.granularity}
                  />
                </div>
              </section>

              <section className={`${cardClass} p-4`}>
                <h2 className="text-[12px] font-semibold text-ink">
                  Recall accuracy
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Correct plus almost, over the cards answered. Gaps mean no
                  session that{" "}
                  {data.range.granularity === "month" ? "month" : "day"}.
                </p>
                <div className="mt-3">
                  <AccuracyChart
                    series={data.series}
                    granularity={data.range.granularity}
                  />
                </div>
              </section>

              <AnalyticsTable
                series={data.series}
                granularity={data.range.granularity}
              />

              {data.weakest.length > 0 ? (
                <section className={`${cardClass} p-4`}>
                  <h2 className="text-[12px] font-semibold text-ink">
                    Words worth another look
                  </h2>
                  <ul className="mt-2 divide-y divide-line-soft">
                    {data.weakest.map((word, index) => (
                      <li
                        key={`${word.id ?? word.word}-${index}`}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="text-[13px] font-semibold text-ink">
                          {word.word}
                        </span>
                        <span className="text-[11px] text-muted">
                          {word.lapses} {word.lapses === 1 ? "miss" : "misses"}{" "}
                          · {formatPercent(word.accuracy)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
