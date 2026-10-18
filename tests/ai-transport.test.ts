import assert from "node:assert/strict";
import test from "node:test";
import {
  AiUnavailableError,
  isRetryableStatus,
  requestCompletion,
  type CompletionRequest,
} from "../lib/ai-transport.ts";

function baseRequest(
  fetchImpl: typeof fetch,
  overrides: Partial<CompletionRequest> = {},
): CompletionRequest {
  return {
    url: "https://provider.test/v1/chat/completions",
    apiKey: "test-key",
    model: "test-model",
    messages: [{ role: "user", content: "translate house" }],
    timeoutMs: 1000,
    retryDelayMs: 0,
    fetchImpl,
    ...overrides,
  };
}

function content(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function timeoutError(): Error {
  return Object.assign(new Error("The operation was aborted"), {
    name: "TimeoutError",
  });
}

const reply = {
  choices: [{ message: { content: '{"words":["rumah"]}' } }],
};

test("a successful call returns the assistant text", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return content(reply);
  }) as unknown as typeof fetch;

  const result = await requestCompletion(baseRequest(fetchImpl));

  assert.equal(result, '{"words":["rumah"]}');
  assert.equal(calls, 1);
});

test("a timeout is retried once and then succeeds", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    if (calls === 1) throw timeoutError();
    return content(reply);
  }) as unknown as typeof fetch;

  const result = await requestCompletion(baseRequest(fetchImpl));

  assert.equal(result, '{"words":["rumah"]}');
  assert.equal(calls, 2);
});

test("a repeated timeout reports the timeout, not a generic failure", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    throw timeoutError();
  }) as unknown as typeof fetch;

  await assert.rejects(
    () => requestCompletion(baseRequest(fetchImpl, { timeoutMs: 1500 })),
    (error: unknown) => {
      assert.ok(error instanceof AiUnavailableError);
      assert.match(error.message, /timed out after 1\.5s/);
      return true;
    },
  );
  assert.equal(calls, 2, "the call is attempted twice");
});

test("a network error is reported as unreachable", async () => {
  const fetchImpl = (async () => {
    throw Object.assign(new Error("ECONNREFUSED"), { name: "TypeError" });
  }) as unknown as typeof fetch;

  await assert.rejects(
    () => requestCompletion(baseRequest(fetchImpl)),
    (error: unknown) => {
      assert.ok(error instanceof AiUnavailableError);
      assert.match(error.message, /unreachable/);
      return true;
    },
  );
});

test("a server fault is retried, a bad request is not", async () => {
  let calls = 0;
  const serverFault = (async () => {
    calls += 1;
    return new Response("nope", { status: 503 });
  }) as unknown as typeof fetch;

  await assert.rejects(() => requestCompletion(baseRequest(serverFault)));
  assert.equal(calls, 2);

  calls = 0;
  const badRequest = (async () => {
    calls += 1;
    return new Response("bad", { status: 400 });
  }) as unknown as typeof fetch;

  await assert.rejects(
    () => requestCompletion(baseRequest(badRequest)),
    (error: unknown) => {
      assert.ok(error instanceof AiUnavailableError);
      assert.match(error.message, /responded with 400/);
      return true;
    },
  );
  assert.equal(calls, 1, "a 400 is not retried");
});

test("an empty reply is treated as a failure", async () => {
  const fetchImpl = (async () =>
    content({
      choices: [{ message: { content: "   " } }],
    })) as unknown as typeof fetch;

  await assert.rejects(
    () => requestCompletion(baseRequest(fetchImpl)),
    (error: unknown) => {
      assert.ok(error instanceof AiUnavailableError);
      assert.match(error.message, /no content/);
      return true;
    },
  );
});

test("a reply cut by the token limit is a failure, not a translation", async () => {
  const fetchImpl = (async () =>
    content({
      choices: [
        {
          message: { content: '{"translations":["rum' },
          finish_reason: "length",
        },
      ],
    })) as unknown as typeof fetch;

  await assert.rejects(
    () => requestCompletion(baseRequest(fetchImpl)),
    (error: unknown) => {
      assert.ok(error instanceof AiUnavailableError);
      assert.match(error.message, /token limit/);
      return true;
    },
  );
});

test("a complete reply passes even when the model reasoned first", async () => {
  const fetchImpl = (async () =>
    content({
      choices: [
        {
          message: { content: '{"translations":["rumah"],"confidence":0.9}' },
          finish_reason: "stop",
        },
      ],
      usage: { completion_tokens: 121, reasoning_tokens: 113 },
    })) as unknown as typeof fetch;

  const result = await requestCompletion(baseRequest(fetchImpl));

  assert.match(result, /rumah/);
});

test("the request carries the key, model, and options", async () => {
  let seen: RequestInit | undefined;
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    seen = init;
    return content(reply);
  }) as unknown as typeof fetch;

  await requestCompletion(
    baseRequest(fetchImpl, { temperature: 0.2, maxTokens: 64 }),
  );

  const headers = seen?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");

  const body = JSON.parse(String(seen?.body));
  assert.equal(body.model, "test-model");
  assert.equal(body.max_tokens, 64);
  assert.equal(body.temperature, 0.2);
});

test("only transient statuses are retryable", () => {
  assert.equal(isRetryableStatus(408), true);
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(500), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(400), false);
  assert.equal(isRetryableStatus(401), false);
  assert.equal(isRetryableStatus(404), false);
});
