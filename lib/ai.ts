import "server-only";

const DEFAULT_BASE_URL = "https://api.inferhub.dev";
const DEFAULT_MODEL = "deepseek-v4.1-flash";
const DEFAULT_TIMEOUT_MS = 5_000;

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

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
  return {
    apiKey,
    baseUrl: (process.env.INFERHUB_BASE_URL || DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    ),
    model: process.env.INFERHUB_MODEL || DEFAULT_MODEL,
    timeoutMs: Number.parseInt(
      process.env.INFERHUB_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
      10,
    ),
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

type ChatMessage = { role: "system" | "user"; content: string };

/**
 * Single-turn chat completion against InferHub (OpenAI-compatible). Returns the
 * raw assistant text; callers own parsing and validation.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (Date.now() < breaker.openUntil) {
    throw new AiUnavailableError("Translation provider is cooling down.");
  }

  const { apiKey, baseUrl, model, timeoutMs } = config();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens ?? 120,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    recordFailure();
    throw new AiUnavailableError("Translation provider timed out.");
  }

  if (!response.ok) {
    recordFailure();
    throw new AiUnavailableError(
      `Translation provider responded with ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    recordFailure();
    throw new AiUnavailableError("Translation provider returned invalid JSON.");
  }

  const content = (
    payload as { choices?: { message?: { content?: unknown } }[] }
  )?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    recordFailure();
    throw new AiUnavailableError("Translation provider returned no content.");
  }

  recordSuccess();
  return content;
}
