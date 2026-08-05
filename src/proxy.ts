import { NextResponse, type NextRequest } from "next/server";

// UX-only guard: presence of an auth cookie decides the redirect. Real
// authorization is enforced by the backend on every API call.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/login" || pathname === "/reset-password";
  const hasAuth = Boolean(
    request.cookies.get("boxify_access") ||
      request.cookies.get("boxify_refresh"),
  );

  if (hasAuth && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!hasAuth && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
