import type { RecallOutcome } from "./types.ts";

/** Longest answer the grader will look at, in characters. */
export const MAX_ANSWER_LENGTH = 120;

/** A typo is only forgiven on words at least this long. */
const ALMOST_MIN_LENGTH = 5;

/**
 * Normalises an answer so cosmetic differences never cost a correct mark:
 * case, surrounding punctuation, curly quotes, dash variants, double spaces,
 * and combining diacritics. Internal apostrophes and hyphens are preserved
 * because they are part of the spelling (`don't` must not equal `dont`).
 */
export function normalizeAnswer(input: string): string {
  let value = input.trim().toLowerCase().normalize("NFKC");

  value = value
    .replace(/[\u2018\u2019\u02bc\u02b9]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ");

  // Strip punctuation only at the edges.
  value = value.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");

  value = value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFKC");

  return value.trim();
}

/**
 * Edit distance that also counts an adjacent transposition as one edit, so
 * `acheive` is one step away from `achieve` rather than two.
 */
export function levenshtein(
  a: string,
  b: string,
  limit = MAX_ANSWER_LENGTH,
): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousPrevious: number[] = [];
  let previous: number[] = Array.from(
    { length: b.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];
    let rowMinimum = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      let distance = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        substitution,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distance = Math.min(distance, previousPrevious[j - 2] + 1);
      }

      current[j] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > limit) return limit + 1;

    previousPrevious = previous;
    previous = current;
  }

  return previous[b.length];
}

export type GradeInput = {
  /** Headword as stored in the dictionary. */
  word: string;
  /** Inflected forms that are also accepted, e.g. `ate`, `eaten`. */
  forms?: string[];
};

/** Non-letter, non-digit, non-space characters, in order. */
function punctuationSkeleton(value: string): string {
  return value.replace(/[\p{L}\p{N}\s]/gu, "");
}

export type AnswerGrade = "correct" | "almost" | "wrong";

/**
 * Grades a typed answer. Only `correct` and `almost` count as a success; the
 * caller decides whether `almost` earns a fast-answer bonus (it never does).
 */
export function gradeAnswer(
  response: string,
  expected: GradeInput,
): AnswerGrade {
  const answer = normalizeAnswer(response);
  if (!answer || answer.length > MAX_ANSWER_LENGTH) return "wrong";

  const candidates = [expected.word, ...(expected.forms ?? [])]
    .map(normalizeAnswer)
    .filter((candidate) => candidate.length > 0);

  if (candidates.includes(answer)) return "correct";

  // A typo is forgiven only when the punctuation matches: dropping an
  // apostrophe changes the word, so `dont` is not "almost" `don't`.
  const skeleton = punctuationSkeleton(answer);
  const close = candidates.some(
    (candidate) =>
      punctuationSkeleton(candidate) === skeleton &&
      candidate.length >= ALMOST_MIN_LENGTH &&
      levenshtein(answer, candidate, 1) <= 1,
  );
  return close ? "almost" : "wrong";
}

/**
 * `choice` cards answer with a meaning rather than the headword, so they are
 * graded against the prompt's translations instead of the word.
 */
export function gradeChoice(
  response: string,
  translations: string[],
): AnswerGrade {
  const answer = normalizeAnswer(response);
  if (!answer || answer.length > MAX_ANSWER_LENGTH) return "wrong";

  const candidates = translations
    .map(normalizeAnswer)
    .filter((candidate) => candidate.length > 0);

  return candidates.includes(answer) ? "correct" : "wrong";
}

/** Maps a grade to the outcome stored in the log. */
export function outcomeFor(grade: AnswerGrade): RecallOutcome {
  return grade;
}
