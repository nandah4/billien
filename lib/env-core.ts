/**
 * Environment parsing, kept free of `server-only` and of `process.env` itself so
 * the validation rules can be tested with a plain object.
 */

export type EnvSource = Record<string, string | undefined>;

export class MissingEnvError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(
      `Missing ${variable}. Add it to .env.local and to the deployment environment.`,
    );
    this.name = "MissingEnvError";
    this.variable = variable;
  }
}

/** A blank value is treated as missing: `FOO=` is almost always a mistake. */
export function readString(
  source: EnvSource,
  name: string,
): string | undefined {
  const value = source[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireString(source: EnvSource, name: string): string {
  const value = readString(source, name);
  if (!value) throw new MissingEnvError(name);
  return value;
}

/** Positive integers only; a malformed value falls back instead of throwing. */
export function readInt(
  source: EnvSource,
  name: string,
  fallback: number,
): number {
  const value = readString(source, name);
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * A base URL with no trailing slash, so callers can append a path without
 * producing `//`. Validated here because a typo in an endpoint should fail with
 * a clear message rather than as a confusing network error later.
 */
export function requireBaseUrl(source: EnvSource, name: string): string {
  const raw = requireString(source, name);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL, got "${raw}".`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${name} must use http or https, got "${url.protocol}".`);
  }

  return raw.replace(/\/+$/, "");
}
