import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.searchParams.has(SESSION_VERIFIER_PARAM)) {
    return NextResponse.next();
  }

  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
