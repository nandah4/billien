/**
 * Shared Tailwind class strings. Kept in one module so the card and button
 * treatments stay identical wherever they are used.
 */

export const cardClass = "rounded-xl border border-line bg-surface shadow-sm";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-surface transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Header controls share one fixed height so the segmented menu, the streak pill,
// the account menu trigger, and the sign-in button all line up.
const headerControl =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

export const headerOutline = `${headerControl} border border-line bg-surface text-ink hover:bg-hover`;
