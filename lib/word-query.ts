/**
 * The lookup contract shared by the search field and the dictionary route.
 *
 * Multi-word entries are real — `according to`, `give up`, `in spite of` — so a
 * space is part of a valid query rather than a separator the caller has to
 * split on. Letters, apostrophes (`o'clock`), and hyphens (`well-known`) are the
 * only other characters the provider accepts.
 *
 * This module is pure: no IO and no `server-only`, so the client validates with
 * exactly the rule the route enforces.
 */

const WORD = "[a-z][a-z'’-]*";

/** One or more words separated by single spaces. */
export const WORD_QUERY_PATTERN = new RegExp(`^${WORD}(?: ${WORD})*$`, "i");

/**
 * The form a query travels in: trimmed, lowercased, and with runs of whitespace
 * collapsed to one space, so `According   To` and `according to` share a cache
 * key and a database row.
 */
export function normalizeWordQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * True when the value can be looked up as an English word or phrase. A single
 * letter passes, because `a` and `I` are real words.
 */
export function isValidWordQuery(raw: string): boolean {
  return WORD_QUERY_PATTERN.test(normalizeWordQuery(raw));
}
