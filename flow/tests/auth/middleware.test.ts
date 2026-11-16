import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import * as supabaseMiddleware from '@/lib/supabase/middleware';
import * as whitelistService from '@/lib/auth/whitelist';

describe('SSR Edge Middleware Gatekeeper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(path: string, cookies: Record<string, string> = {}) {
    const url = new URL(`http://localhost:3000${path}`);
    const req = new NextRequest(url);
    Object.entries(cookies).forEach(([k, v]) => {
      req.cookies.set(k, v);
    });
    return req;
  }

  it('redirects unauthenticated requests targeting /dashboard with HTTP 307 to /login', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    const req = createMockRequest('/dashboard');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('/login?redirect=%2Fdashboard');
  });

  it('redirects unauthenticated requests targeting /routines/morning with HTTP 307 to /login', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    const req = createMockRequest('/routines/morning');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirect=%2Froutines%2Fmorning');
  });

  it('blocks unauthenticated API requests to /api/unstick with HTTP 401 JSON', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    const req = createMockRequest('/api/unstick');
    const res = await middleware(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('redirects authenticated but non-whitelisted users to /access-denied with HTTP 307 and revokes session', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-uninvited', email: 'uninvited@example.com' } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

    const req = createMockRequest('/dashboard');
    const res = await middleware(req);

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/access-denied');
  });

  it('blocks authenticated but non-whitelisted API requests with HTTP 403 JSON', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-uninvited', email: 'uninvited@example.com' } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

    const req = createMockRequest('/api/unstick');
    const res = await middleware(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('allows authenticated and whitelisted users to pass through to /dashboard without redirection', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-approved', email: 'sk@buildnest.buzz' } },
          error: null,
        }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

    const req = createMockRequest('/dashboard');
    const res = await middleware(req);

    // Passthrough response status is 200 (not a 307 redirect)
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects authenticated & whitelisted user visiting /login to /dashboard', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-approved', email: 'sk@buildnest.buzz' } },
          error: null,
        }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

    const req = createMockRequest('/login');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('permits unauthenticated visitors to view public landing page /', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };

    vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
      supabase: mockSupabase as any,
      response: NextResponse.next(),
    });

    const req = createMockRequest('/');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
