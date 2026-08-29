import { NextResponse, type NextRequest } from "next/server";

/**
 * A first gate in front of the admin area.
 *
 * This is a convenience, not the protection. Middleware runs on the edge
 * runtime where the Node crypto used to verify a session signature is not
 * available, so all this can check is that a session cookie is present — which
 * anyone can fake by setting a cookie.
 *
 * What actually protects the admin area is `isAdminRequest` on every page and
 * `requireAdmin` on every endpoint, both of which verify the signature on the
 * server. This only saves a signed-out visitor from loading a page that would
 * immediately redirect them, and it keeps /admin from being a way to discover
 * anything by its response time.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const hasCookie = request.cookies.has("elshadai_admin");
  if (hasCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Pages only. The API routes verify for themselves and must return 401
  // rather than a redirect to a login page, which is not a useful answer to a
  // fetch.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
