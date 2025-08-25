
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // Middleware is not currently required for the client-side auth flow.
    // The authentication logic is now handled robustly in the AuthProvider.
    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /login (the login page itself)
     * - / (the public landing page)
     * - /view (publicly shared tables)
     * - /u (public user profiles)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|view|u|$).*)',
  ],
}
