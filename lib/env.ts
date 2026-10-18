import "server-only";

import {
  readInt,
  readString,
  requireBaseUrl,
  requireString,
  type EnvSource,
} from "./env-core.ts";

/**
 * Every server-side environment variable, in one place.
 *
 * Each name is read statically rather than through `process.env[name]`, because
 * bundlers only guarantee the statically referenced variables survive into the
 * server build. Listing them here also gives one place to audit what the server
 * reads.
 */
const source: EnvSource = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
  NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  INFERHUB_API_KEY: process.env.INFERHUB_API_KEY,
  INFERHUB_BASE_URL: process.env.INFERHUB_BASE_URL,
  INFERHUB_MODEL: process.env.INFERHUB_MODEL,
  INFERHUB_TIMEOUT_MS: process.env.INFERHUB_TIMEOUT_MS,
  DICTIONARY_BASE_URL: process.env.DICTIONARY_BASE_URL,
  DICTIONARY_TIMEOUT_MS: process.env.DICTIONARY_TIMEOUT_MS,
};

/**
 * Accessors are lazy on purpose: a missing variable must fail at request time
 * with a message naming it, not at build time, so a build is never blocked by a
 * value only the runtime needs.
 *
 * Nothing here may be exposed to the browser. Secrets stay server-only, which is
 * why this module imports `server-only` and no variable uses the `NEXT_PUBLIC_`
 * prefix.
 */
export const env = {
  databaseUrl: () => requireString(source, "DATABASE_URL"),

  neonAuth: {
    baseUrl: () => requireBaseUrl(source, "NEON_AUTH_BASE_URL"),
    cookieSecret: () => requireString(source, "NEON_AUTH_COOKIE_SECRET"),
  },

  /**
   * Translation fallback. The whole group is optional: without a key, AI is a
   * no-op and the dictionary is the only source. When a key is present, the
   * endpoint and model are required, so a half-configured provider reports a
   * clear error instead of silently calling a default host.
   */
  ai: {
    apiKey: () => readString(source, "INFERHUB_API_KEY"),
    baseUrl: () => requireBaseUrl(source, "INFERHUB_BASE_URL"),
    model: () => requireString(source, "INFERHUB_MODEL"),
    timeoutMs: () => readInt(source, "INFERHUB_TIMEOUT_MS", 15_000),
  },

  dictionary: {
    baseUrl: () => requireBaseUrl(source, "DICTIONARY_BASE_URL"),
    timeoutMs: () => readInt(source, "DICTIONARY_TIMEOUT_MS", 8_000),
  },
} as const;
