import { authServiceOrigin, getAuth } from "@/lib/auth";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function invalidOrigin() {
  return Response.json(
    { message: "Invalid origin", code: "INVALID_ORIGIN" },
    { status: 403 },
  );
}

/**
 * Neon Auth rejects state-changing requests whose `Origin` is missing from the
 * branch's trusted origins, and that list is static. Preview deployments get a
 * new hostname on every push, so they can never be listed and sign-out — or
 * any other mutation — fails with `INVALID_ORIGIN`.
 *
 * The browser request is same-origin with the deployment that served it, so
 * that is verified here. The request is then forwarded to Neon Auth as coming
 * from the auth service's own origin, which it always trusts. Checking the
 * caller first keeps the cross-site request forgery protection meaningful.
 */
function normalizeOrigin(request: Request): Request | Response {
  if (!MUTATING_METHODS.has(request.method)) return request;

  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return invalidOrigin();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return invalidOrigin();
  }
  if (originHost !== host) return invalidOrigin();

  const headers = new Headers(request.headers);
  headers.set("origin", authServiceOrigin());
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // Required by Node for a streamed request body.
    duplex: "half",
  } as RequestInit);
}

/*
 * Each method is delegated explicitly: the SDK handler's methods rely on
 * private class fields, so they must be called on the handler object rather
 * than through a detached reference.
 */

export async function GET(request: Request, context: AuthRouteContext) {
  const normalized = normalizeOrigin(request);
  if (normalized instanceof Response) return normalized;
  return getAuth().handler().GET(normalized, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const normalized = normalizeOrigin(request);
  if (normalized instanceof Response) return normalized;
  return getAuth().handler().POST(normalized, context);
}

export async function PUT(request: Request, context: AuthRouteContext) {
  const normalized = normalizeOrigin(request);
  if (normalized instanceof Response) return normalized;
  return getAuth().handler().PUT(normalized, context);
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  const normalized = normalizeOrigin(request);
  if (normalized instanceof Response) return normalized;
  return getAuth().handler().PATCH(normalized, context);
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  const normalized = normalizeOrigin(request);
  if (normalized instanceof Response) return normalized;
  return getAuth().handler().DELETE(normalized, context);
}
