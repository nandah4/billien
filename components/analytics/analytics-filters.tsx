"use client";

import { X } from "lucide-react";
import { PRESETS } from "@/lib/analytics/range";
import type { AnalyticsPreset, Granularity } from "@/lib/analytics/types";

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "month", label: "Monthly" },
];

/**
 * Range controls. Picking a preset clears the month filter; picking a month
 * leaves the preset alone but takes precedence on the server, which is why the
 * chips lose their pressed state while a month is active.
 */
export function AnalyticsFilters({
  preset,
  month,
  granularity,
  onPreset,
  onMonth,
  onGranularity,
  disabled = false,
}: {
  preset: AnalyticsPreset;
  month: string | null;
  granularity: Granularity | null;
  onPreset: (preset: AnalyticsPreset) => void;
  onMonth: (month: string | null) => void;
  onGranularity: (granularity: Granularity | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((item) => {
          const active = month === null && preset === item.id;
          return (
            <button
              key={item.id}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-accent-line bg-accent-soft text-accent"
                  : "border-line bg-surface text-muted hover:text-ink"
              }`}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onPreset(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className="text-[11px] font-semibold tracking-wider text-muted uppercase"
          htmlFor="analytics-month"
        >
          Month
        </label>
        <input
          id="analytics-month"
          className={`h-8 rounded-lg border px-2 text-[12px] text-ink transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            month
              ? "border-accent-line bg-accent-soft"
              : "border-line bg-surface"
          }`}
          type="month"
          value={month ?? ""}
          disabled={disabled}
          onChange={(event) => onMonth(event.target.value || null)}
        />
        {month ? (
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={() => onMonth(null)}
          >
            <X size={12} aria-hidden="true" />
            Clear
          </button>
        ) : null}

        <span
          className="mx-1 hidden h-4 w-px bg-line sm:block"
          aria-hidden="true"
        />

        <div className="inline-flex rounded-lg border border-line bg-subtle p-0.5">
          {GRANULARITIES.map((item) => {
            const active = granularity === item.id;
            return (
              <button
                key={item.id}
                className={`inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${
                  active
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onGranularity(active ? null : item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
