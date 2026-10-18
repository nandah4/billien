import "server-only";

import {
  AiUnavailableError,
  requestCompletion,
  type ChatMessage,
} from "@/lib/ai-transport";

export { AiUnavailableError } from "@/lib/ai-transport";
export type { ChatMessage } from "@/lib/ai-transport";

const DEFAULT_BASE_URL = "https://api.inferhub.dev";
const DEFAULT_MODEL = "deepseek-v4.1-flash";

/**
 * A translation is a short generation, but five seconds was not enough for a
 * cold provider: it timed out often enough that saved words arrived without a
 * translation. Fifteen seconds leaves room for the model to answer, and the
 * transport retries once, so the call still fails fast when the endpoint is
 * genuinely down.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Minimal circuit breaker: after five consecutive failures the provider is
 * skipped for a minute, so a dead endpoint cannot add latency to every request.
 */
const breaker = {
  failures: 0,
  openUntil: 0,
};

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

function config() {
  const apiKey = process.env.INFERHUB_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("INFERHUB_API_KEY is not configured.");
  }

  const configured = Number.parseInt(
    process.env.INFERHUB_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
    10,
  );

  return {
    apiKey,
    baseUrl: (process.env.INFERHUB_BASE_URL || DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    ),
    model: process.env.INFERHUB_MODEL || DEFAULT_MODEL,
    timeoutMs:
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_TIMEOUT_MS,
  };
}

export function isAiConfigured() {
  return Boolean(process.env.INFERHUB_API_KEY);
}

export function aiModel() {
  return process.env.INFERHUB_MODEL || DEFAULT_MODEL;
}

function recordSuccess() {
  breaker.failures = 0;
  breaker.openUntil = 0;
}

function recordFailure() {
  breaker.failures += 1;
  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.openUntil = Date.now() + COOLDOWN_MS;
    breaker.failures = 0;
  }
}

/**
 * Single-turn chat completion against InferHub ([OI]-compatible). Returns the
 * raw assistant text; callers own parsing and validation. One call counts as one
 * breaker failure at most, however many transport attempts it made.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (Date.now() < breaker.openUntil) {
    throw new AiUnavailableError("Translation provider is cooling down.");
  }

  const { apiKey, baseUrl, model, timeoutMs } = config();

  try {
    const content = await requestCompletion({
      url: `${baseUrl}/v1/chat/completions`,
      apiKey,
      model,
      messages,
      temperature: options.temperature ?? 0,
      maxTokens: options.maxTokens ?? 120,
      timeoutMs,
    });
    recordSuccess();
    return content;
  } catch (error) {
    recordFailure();
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError("Translation provider failed.", {
      cause: error,
    });
  }
}
