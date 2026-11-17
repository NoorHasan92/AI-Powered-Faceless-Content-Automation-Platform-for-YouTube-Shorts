// File Location: src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Protect all routes except API auth, login, and static assets
const protectedRoutes = ["/", "/projects", "/settings", "/analytics"];
const publicRoutes = ["/login", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore all API routes and static files
  if (pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isProtectedRoute = (pathname === "/" || protectedRoutes.some((route) => route !== "/" && pathname.startsWith(route))) && !isPublicRoute;

  // If the route is protected and no session exists, redirect to login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If a session exists, verify it
  if (session) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const encodedKey = new TextEncoder().encode(secret);
        await jwtVerify(session, encodedKey);
      }

      // If logged in and trying to access /login, redirect to dashboard
      if (isPublicRoute) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // If token is invalid/expired, clear it and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|pipeline/).*)",
  ],
};

