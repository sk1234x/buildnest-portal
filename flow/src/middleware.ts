import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { isEmailWhitelisted } from '@/lib/auth/whitelist';

// Routes requiring an authenticated session AND whitelisted email
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/routines',
  '/unstick',
  '/profile',
  '/api/protected',
  '/api/unstick',
];

// Routes reserved for unauthenticated visitors
const AUTH_PREFIXES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthRoute = AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Authenticate user via Supabase Auth (verifies JWT and refreshes token if expired)
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch {
    user = null;
  }

  // 1. Unauthenticated request to protected route -> Intercept before rendering
  if (!user && isProtected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);

    const redirectResponse = NextResponse.redirect(loginUrl, { status: 307 });
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // 2. Authenticated user attempting to access protected route -> Enforce Whitelist
  if (user && isProtected) {
    const isAllowed = await isEmailWhitelisted(user.email, supabase);

    if (!isAllowed) {
      // Invalidate session for non-whitelisted account
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue with redirect even if signOut encounters error
      }

      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Whitelist Access Required' },
          { status: 403 }
        );
      }

      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = '/access-denied';

      const redirectResponse = NextResponse.redirect(deniedUrl, { status: 307 });
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  // 3. Authenticated & whitelisted user visiting login/signup -> Redirect to /dashboard
  if (user && isAuthRoute) {
    const isAllowed = await isEmailWhitelisted(user.email, supabase);
    if (isAllowed) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';

      const redirectResponse = NextResponse.redirect(dashboardUrl, { status: 307 });
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, favicon, and image optimization:
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
