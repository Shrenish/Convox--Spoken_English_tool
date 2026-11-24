/**
 * Next.js Edge Middleware — route protection.
 *
 * Protected routes (/dashboard, /conversation, /progress, /travel, /autopsy)
 * require the `convox_session` cookie to be present (JWT presence check only —
 * full verification happens on the backend).
 *
 * If the cookie is absent, redirect to the welcome page (/).
 * The backend will return 401 if the token is invalid/expired, which the
 * frontend auth context handles by clearing the user state.
 */

import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/conversation",
  "/progress",
  "/travel",
  "/autopsy",
  "/onboarding",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get("convox_session");

  if (!sessionCookie?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/conversation/:path*",
    "/progress/:path*",
    "/travel/:path*",
    "/autopsy/:path*",
    "/onboarding/:path*",
  ],
};
