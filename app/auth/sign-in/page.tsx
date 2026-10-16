import { redirect } from "next/navigation";

/**
 * The sign-in UI lives in a modal on the home page. This route is kept as a
 * redirect because `proxy.ts` passes it as `loginUrl` to the Neon Auth
 * middleware, which can send users here when an OAuth exchange fails. The
 * verifier parameter is deliberately dropped so the middleware does not run
 * again on the target route.
 */
export default function SignInPage() {
  redirect("/");
}
