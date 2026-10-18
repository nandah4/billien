import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let authInstance: ReturnType<typeof createNeonAuth> | undefined;

function required(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET") {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Missing ${name}. Add it to .env.local before starting Billien.`,
    );
  return value;
}

/**
 * Origin of the Neon Auth service itself. Neon Auth always trusts its own
 * origin, so the auth proxy presents this when it forwards a mutation.
 */
export function authServiceOrigin() {
  return new URL(required("NEON_AUTH_BASE_URL")).origin;
}

export function getAuth() {
  if (!authInstance) {
    authInstance = createNeonAuth({
      baseUrl: required("NEON_AUTH_BASE_URL"),
      cookies: {
        secret: required("NEON_AUTH_COOKIE_SECRET"),
        sessionDataTtl: 300,
      },
      logLevel: "warn",
    });
  }
  return authInstance;
}

export async function currentUserId() {
  const { data: session } = await getAuth().getSession();
  return session?.user?.id ?? null;
}
