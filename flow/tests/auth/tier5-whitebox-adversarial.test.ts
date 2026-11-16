import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import * as supabaseMiddleware from '@/lib/supabase/middleware';
import * as whitelistService from '@/lib/auth/whitelist';
import { GET as callbackGet } from '@/app/auth/callback/route';
import * as serverSupabase from '@/lib/supabase/server';
import {
  normalizeEmail,
  getEnvWhitelist,
  checkWhitelist,
  assertAuthenticatedAndWhitelisted,
} from '@/lib/auth/whitelist';

describe('Tier 5 White-Box Adversarial Hardening: Edge Middleware Gatekeeper', () => {
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

  describe('1. Malformed Cookie & Token Header Stress', () => {
    it('handles corrupted, non-JWT cookie gracefully without 500 error', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error('Malformed JWT header')),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      const req = createMockRequest('/dashboard', {
        'sb-access-token': 'corrupted-not-a-jwt.###$$$',
      });
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login?redirect=%2Fdashboard');
    });

    it('handles giant / oversized cookie payload (16KB) without crashing', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Token header too large'),
          }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      const giantValue = 'a'.repeat(16384);
      const req = createMockRequest('/dashboard', {
        'oversized-token': giantValue,
      });
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });

    it('blocks API route with 401 when token is expired', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('JWT expired'),
          }),
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
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('2. Path Normalization & Nested Route Interception', () => {
    const protectedNestedPaths = [
      '/dashboard/',
      '/dashboard/settings',
      '/dashboard/settings/profile',
      '/routines/morning',
      '/routines/momentum',
      '/routines/evening',
      '/unstick',
      '/profile',
      '/api/protected/v1/user',
      '/api/unstick',
    ];

    for (const path of protectedNestedPaths) {
      it(`intercepts unauthenticated request to nested protected path ${path}`, async () => {
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

        const req = createMockRequest(path);
        const res = await middleware(req);

        if (path.startsWith('/api/')) {
          expect(res.status).toBe(401);
        } else {
          expect(res.status).toBe(307);
          const location = res.headers.get('location') || '';
          expect(location).toMatch(/\/login\/?\?redirect=/);
          expect(location).toContain(encodeURIComponent(path));
        }
      });
    }
  });

  describe('3. Session Revocation & Error Path Resilience', () => {
    it('survives signOut() rejection when evicting non-whitelisted user and still redirects', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'usr-uninvited', email: 'intruder@bad.com' } },
            error: null,
          }),
          signOut: vi.fn().mockRejectedValue(new Error('Supabase network timeout during signOut')),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

      const req = createMockRequest('/dashboard');
      const res = await middleware(req);

      // signOut was called even if it failed
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      // Redirect still safely executed to /access-denied
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/access-denied');
    });

    it('preserves refreshed session cookies when returning 307 redirect', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut: vi.fn(),
        },
      };

      const initialResponse = NextResponse.next();
      // Simulate Supabase refresh writing a new cookie
      initialResponse.cookies.set('sb-refreshed-token', 'new-token-value', { path: '/' });

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: initialResponse,
      });

      const req = createMockRequest('/dashboard');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.cookies.get('sb-refreshed-token')?.value).toBe('new-token-value');
    });
  });
});

describe('Tier 5 White-Box Adversarial Hardening: OAuth Callback & Open Redirect Sanitization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createCallbackRequest(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    const url = `http://localhost:3000/auth/callback?${search}`;
    return new NextRequest(url);
  }

  describe('1. Open Redirect Vector Fuzzing', () => {
    const attackVectors = [
      { input: 'https://evil.com', desc: 'Absolute HTTPS URL' },
      { input: 'http://evil.com', desc: 'Absolute HTTP URL' },
      { input: '//evil.com', desc: 'Protocol-relative URL' },
      { input: '///evil.com', desc: 'Triple slash protocol-relative URL' },
      { input: '////evil.com/steal', desc: 'Quad slash protocol-relative URL' },
      { input: 'javascript:alert(1)', desc: 'javascript: scheme' },
      { input: 'data:text/html,<script>alert(1)</script>', desc: 'data: scheme' },
      { input: 'vbscript:msgbox(1)', desc: 'vbscript: scheme' },
      { input: 'https://flow.buildnest.buzz.evil.com', desc: 'Domain prefix spoofing' },
      { input: '\\evil.com', desc: 'Single leading backslash' },
      { input: 'evil.com', desc: 'Raw domain without slash' },
      { input: '   /dashboard', desc: 'Leading whitespace before path' },
      { input: 'ftp://evil.com/path', desc: 'FTP protocol URL' },
      { input: 'file:///etc/passwd', desc: 'file: scheme URL' },
    ];

    for (const vector of attackVectors) {
      it(`sanitizes vector "${vector.desc}" to safe internal destination`, async () => {
        const mockSupabase = {
          auth: {
            exchangeCodeForSession: vi.fn().mockResolvedValue({
              data: {
                user: { id: 'u-1', email: 'allowed@buildnest.buzz' },
              },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }),
        };

        vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);
        vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

        const req = createCallbackRequest({
          code: 'valid-test-code',
          next: vector.input,
        });
        const res = await callbackGet(req);

        expect(res.status).toBe(307);
        const location = res.headers.get('location') || '';
        const url = new URL(location);

        expect(url.origin).toBe('http://localhost:3000');
        expect(url.pathname).toBe('/dashboard');
        expect(location).not.toContain('evil.com');
      });
    }

    it('permits valid internal routes with query params', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-1', email: 'allowed@buildnest.buzz' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);
      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

      const validPaths = [
        '/dashboard',
        '/routines/morning',
        '/routines/momentum?focus=active',
        '/routines/evening',
        '/unstick?from=morning',
      ];

      for (const validPath of validPaths) {
        const req = createCallbackRequest({
          code: 'valid-test-code',
          next: validPath,
        });
        const res = await callbackGet(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe(`http://localhost:3000${validPath}`);
      }
    });
  });

  describe('2. Error Parameter Injection & Header Safety', () => {
    it('properly URI encodes error parameters from provider to prevent CRLF injection', async () => {
      const maliciousError = 'access_denied\r\nSet-Cookie:malicious=true\r\n';
      const req = createCallbackRequest({ error: maliciousError });
      const res = await callbackGet(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('login?error=');
      // Verify raw CRLF characters are not in the Location header
      expect(location).not.toContain('\r');
      expect(location).not.toContain('\n');
      expect(location).toContain('%0D%0A');
    });

    it('redirects with missing_code when code is absent or empty', async () => {
      const reqEmpty = createCallbackRequest({ code: '' });
      const resEmpty = await callbackGet(reqEmpty);
      expect(resEmpty.status).toBe(307);
      expect(resEmpty.headers.get('location')).toContain('/login?error=missing_code');
    });
  });

  describe('3. Token Exchange Failure & Non-Whitelisted Account Revocation', () => {
    it('revokes session immediately and redirects to /login?error=not_whitelisted when account is uninvited', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-uninvited', email: 'uninvited@other.com' } },
            error: null,
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);
      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

      const req = createCallbackRequest({ code: 'valid-code-uninvited' });
      const res = await callbackGet(req);

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login?error=not_whitelisted');
    });

    it('handles profile upsert failure gracefully without blocking authentication', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-whitelisted', email: 'allowed@buildnest.buzz' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockRejectedValue(new Error('relation profiles does not exist')),
        }),
      };

      vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);
      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

      const req = createCallbackRequest({ code: 'valid-code' });
      const res = await callbackGet(req);

      // Successfully completes redirect despite profiles table failure
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });
  });
});

describe('Tier 5 White-Box Adversarial Hardening: Whitelist Service & Fallbacks', () => {
  const originalEnv = process.env.WHITELIST_EMAILS;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WHITELIST_EMAILS = originalEnv;
  });

  describe('1. normalizeEmail Boundary & Fuzzing', () => {
    it('handles 10,000-character long email string without crashing or ReDoS', () => {
      const longEmail = 'a'.repeat(9980) + '@example.com';
      const result = normalizeEmail(longEmail);
      expect(result).toBe(longEmail.toLowerCase());
    });

    it('strips all whitespace variants (tabs, newlines, carriage returns, spaces)', () => {
      expect(normalizeEmail('\t\n\r  User.Name+Tag@BuildNest.Buzz  \r\n\t')).toBe(
        'user.name+tag@buildnest.buzz'
      );
    });

    it('returns null for non-string, empty, or whitespace-only inputs', () => {
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail('   ')).toBeNull();
      expect(normalizeEmail('\t\n\r')).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
      expect(normalizeEmail(undefined)).toBeNull();
      expect(normalizeEmail(12345 as any)).toBeNull();
      expect(normalizeEmail({} as any)).toBeNull();
      expect(normalizeEmail([] as any)).toBeNull();
      expect(normalizeEmail(true as any)).toBeNull();
      expect(normalizeEmail(false as any)).toBeNull();
    });
  });

  describe('2. Dual Storage Failover Logic (RPC -> Table -> ENV)', () => {
    it('falls back to table query when RPC function returns false or error', async () => {
      delete process.env.WHITELIST_EMAILS;

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'wl-1', email: 'table-match@buildnest.buzz' }],
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await checkWhitelist('table-match@buildnest.buzz', mockSupabase as any);
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_db');
    });

    it('falls back to environment variable when database throws connection outage', async () => {
      process.env.WHITELIST_EMAILS = 'outage-user@buildnest.buzz';

      const mockSupabase = {
        rpc: vi.fn().mockRejectedValue(new Error('Connection reset by peer: 5432')),
      };

      const result = await checkWhitelist('outage-user@buildnest.buzz', mockSupabase as any);
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_env');
    });

    it('fails closed when email is absent from all storage mechanisms', async () => {
      process.env.WHITELIST_EMAILS = 'admin@buildnest.buzz';

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };

      const result = await checkWhitelist('intruder@unknown.com', mockSupabase as any);
      expect(result.isWhitelisted).toBe(false);
      expect(result.reason).toBe('not_whitelisted');
    });
  });

  describe('3. Server-side Guard assertAuthenticatedAndWhitelisted', () => {
    it('throws Unauthorized when getUser() returns null or session error', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Session expired') }),
        },
      };

      await expect(assertAuthenticatedAndWhitelisted(mockSupabase as any)).rejects.toThrow(
        'Unauthorized: No active session'
      );
    });

    it('throws Unauthorized when user object has no email address', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-no-email', email: null } },
            error: null,
          }),
        },
      };

      await expect(assertAuthenticatedAndWhitelisted(mockSupabase as any)).rejects.toThrow(
        'Unauthorized: No active session'
      );
    });

    it('throws Forbidden when user is authenticated but not on whitelist', async () => {
      process.env.WHITELIST_EMAILS = 'vip@buildnest.buzz';

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-uninvited', email: 'uninvited@guest.com' } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };

      await expect(assertAuthenticatedAndWhitelisted(mockSupabase as any)).rejects.toThrow(
        'Forbidden: User email is not whitelisted'
      );
    });

    it('returns userId and email when user is whitelisted', async () => {
      process.env.WHITELIST_EMAILS = 'founder@buildnest.buzz';

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-founder', email: 'founder@buildnest.buzz' } },
            error: null,
          }),
        },
      };

      const result = await assertAuthenticatedAndWhitelisted(mockSupabase as any);
      expect(result).toEqual({
        userId: 'u-founder',
        email: 'founder@buildnest.buzz',
      });
    });
  });
});
