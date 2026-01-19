import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/admin", "/coach", "/dashboard", "/chat"];

// Routes that are public
const publicRoutes = ["/", "/login", "/demo"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/demo"),
  );

  // For protected routes, check for auth token
  if (isProtectedRoute) {
    // Check for auth storage in cookie (set by client)
    // Note: This is a simple check. For production, verify JWT on server
    const authStorage = request.cookies.get("auth-storage");

    // If no auth storage cookie, try checking Authorization header
    const authHeader = request.headers.get("Authorization");

    // For client-side navigation, the auth state is in localStorage
    // We can't check localStorage in middleware, so we rely on:
    // 1. Cookie-based auth (if implemented)
    // 2. Client-side redirect (fallback)

    // For now, allow the request and let client-side handle auth check
    // This prevents blocking requests that are authenticated via localStorage

    // If you want strict server-side protection:
    // Uncomment below and implement proper cookie-based auth
    /*
    if (!authStorage && !authHeader) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    */
  }

  // For login page, redirect to dashboard if already authenticated
  if (pathname === "/login") {
    const authStorage = request.cookies.get("auth-storage");
    if (authStorage) {
      try {
        const auth = JSON.parse(authStorage.value);
        if (auth?.state?.isAuthenticated) {
          // Redirect based on role
          const role = auth?.state?.user?.role;
          if (role === "ADMIN") {
            return NextResponse.redirect(new URL("/admin", request.url));
          } else if (role === "COACH") {
            return NextResponse.redirect(new URL("/coach", request.url));
          } else {
            return NextResponse.redirect(new URL("/dashboard", request.url));
          }
        }
      } catch (e) {
        // Invalid JSON, continue to login
      }
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
