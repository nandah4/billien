import "server-only";

import { env } from "@/lib/env";
import {
  AiUnavailableError,
  requestCompletion,
  type ChatMessage,
} from "@/lib/ai-transport";

export { AiUnavailableError } from "@/lib/ai-transport";
export type { ChatMessage } from "@/lib/ai-transport";

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
  const apiKey = env.ai.apiKey();
  if (!apiKey) {
    throw new AiUnavailableError("INFERHUB_API_KEY is not configured.");
  }

  return {
    apiKey,
    baseUrl: env.ai.baseUrl(),
    model: env.ai.model(),
    timeoutMs: env.ai.timeoutMs(),
  };
}

export function isAiConfigured() {
  return Boolean(env.ai.apiKey());
}

export function aiModel() {
  return env.ai.model();
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
