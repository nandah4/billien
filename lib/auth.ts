import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

let authInstance: ReturnType<typeof createNeonAuth> | undefined;

/**
 * Origin of the Neon Auth service itself. Neon Auth always trusts its own
 * origin, so the auth proxy presents this when it forwards a mutation.
 */
export function authServiceOrigin() {
  return new URL(env.neonAuth.baseUrl()).origin;
}

export function getAuth() {
  if (!authInstance) {
    authInstance = createNeonAuth({
      baseUrl: env.neonAuth.baseUrl(),
      cookies: {
        secret: env.neonAuth.cookieSecret(),
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
