/**
 * Provider transport, kept free of `server-only` so the retry and timeout rules
 * can be tested with a stubbed `fetch`.
 */

export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export type ChatMessage = { role: "system" | "user"; content: string };

export type CompletionRequest = {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Applied per attempt, not to the call as a whole. */
  timeoutMs: number;
  /** Total tries, including the first. */
  attempts?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

/** A timeout, a rate limit, and a server fault are worth retrying; a 400 is not. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Outcome =
  | { ok: true; content: string }
  | { ok: false; retryable: boolean; message: string };

function seconds(ms: number): string {
  const value = ms / 1000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

async function attempt(
  request: CompletionRequest,
  fetchImpl: typeof fetch,
): Promise<Outcome> {
  let response: Response;
  try {
    response = await fetchImpl(request.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens ?? 120,
      }),
      signal: AbortSignal.timeout(request.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (isTimeout(error)) {
      return {
        ok: false,
        retryable: true,
        message: `Translation provider timed out after ${seconds(request.timeoutMs)}s.`,
      };
    }
    return {
      ok: false,
      retryable: true,
      message: "Translation provider is unreachable.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      retryable: isRetryableStatus(response.status),
      message: `Translation provider responded with ${response.status}.`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      retryable: true,
      message: "Translation provider returned invalid JSON.",
    };
  }

  const content = (
    payload as {
      choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
    }
  )?.choices?.[0];

  // A reasoning model spends part of the budget on its own thinking. When it
  // runs out, the reply is cut mid-JSON, which reads as a parse failure unless
  // the reason is checked first.
  if (content?.finish_reason === "length") {
    return {
      ok: false,
      retryable: true,
      message: "Translation provider stopped at the token limit.",
    };
  }

  const text = content?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    return {
      ok: false,
      retryable: true,
      message: "Translation provider returned no content.",
    };
  }

  return { ok: true, content: text };
}

/**
 * Calls the provider, retrying a transient failure once. A timeout is the
 * common case: a generation that needs a few more seconds should not mark the
 * word as untranslatable on the first try.
 */
export async function requestCompletion(
  request: CompletionRequest,
): Promise<string> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const total = Math.max(1, request.attempts ?? DEFAULT_ATTEMPTS);
  const delay = request.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let last: Extract<Outcome, { ok: false }> | null = null;

  for (let index = 1; index <= total; index += 1) {
    const outcome = await attempt(request, fetchImpl);
    if (outcome.ok) return outcome.content;

    last = outcome;
    if (!outcome.retryable || index === total) break;
    await sleep(delay);
  }

  throw new AiUnavailableError(last?.message ?? "Translation provider failed.");
}
