import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { isPublicUnstickEnabled, featureFlags } from '@/lib/config/features';
import { middleware } from '@/middleware';
import { POST as unstickApiPost } from '@/app/api/unstick/route';
import * as supabaseMiddleware from '@/lib/supabase/middleware';
import * as whitelistModule from '@/lib/auth/whitelist';

describe('Feature Flags Configuration Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isPublicUnstickEnabled() Evaluation', () => {
    it('returns true when NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK is set to "true"', () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'true';
      delete process.env.ALLOW_PUBLIC_UNSTICK;

      expect(isPublicUnstickEnabled()).toBe(true);
      expect(featureFlags.allowPublicUnstick).toBe(true);
    });

    it('returns true when NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK is set to "1"', () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = '1';
      delete process.env.ALLOW_PUBLIC_UNSTICK;

      expect(isPublicUnstickEnabled()).toBe(true);
    });

    it('returns false when NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK is set to "false"', () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'false';
      delete process.env.ALLOW_PUBLIC_UNSTICK;

      expect(isPublicUnstickEnabled()).toBe(false);
      expect(featureFlags.allowPublicUnstick).toBe(false);
    });

    it('returns false when NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK is set to "0"', () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = '0';
      delete process.env.ALLOW_PUBLIC_UNSTICK;

      expect(isPublicUnstickEnabled()).toBe(false);
    });

    it('falls back to ALLOW_PUBLIC_UNSTICK if NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK is unset', () => {
      delete process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK;
      process.env.ALLOW_PUBLIC_UNSTICK = 'true';

      expect(isPublicUnstickEnabled()).toBe(true);

      process.env.ALLOW_PUBLIC_UNSTICK = 'false';
      expect(isPublicUnstickEnabled()).toBe(false);
    });

    it('handles whitespace and case variations gracefully (" TRUE ", " False ")', () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = '  TRUE  ';
      expect(isPublicUnstickEnabled()).toBe(true);

      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = '  FALSE  ';
      expect(isPublicUnstickEnabled()).toBe(false);
    });
  });

  describe('Middleware Integration with Flag', () => {
    function createMockRequest(path: string) {
      return new NextRequest(`https://flow.buildnest.buzz${path}`);
    }

    it('allows unauthenticated requests to /unstick and /api/unstick when flag is enabled', async () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'true';

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

      // 1. Unstick Page
      const pageReq = createMockRequest('/unstick');
      const pageRes = await middleware(pageReq);
      expect(pageRes.status).toBe(200);
      expect(pageRes.headers.get('location')).toBeNull();

      // 2. Unstick API
      const apiReq = createMockRequest('/api/unstick');
      const apiRes = await middleware(apiReq);
      expect(apiRes.status).toBe(200);
      expect(apiRes.headers.get('location')).toBeNull();
    });

    it('blocks unauthenticated requests to /unstick and /api/unstick when flag is disabled', async () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'false';

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

      // 1. Unstick Page -> Redirect to /login
      const pageReq = createMockRequest('/unstick');
      const pageRes = await middleware(pageReq);
      expect(pageRes.status).toBe(307);
      expect(pageRes.headers.get('location')).toContain('/login?redirect=%2Funstick');

      // 2. Unstick API -> HTTP 401 Unauthorized
      const apiReq = createMockRequest('/api/unstick');
      const apiRes = await middleware(apiReq);
      expect(apiRes.status).toBe(401);
      const body = await apiRes.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('API Route Integration with Flag', () => {
    it('allows unauthenticated POST to /api/unstick when flag is enabled without checking whitelist', async () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'true';

      const whitelistSpy = vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted');

      const request = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        body: JSON.stringify({ preferredCategory: 'physical_somatic' }),
      });

      const response = await unstickApiPost(request);
      expect(response.status).toBe(200);
      expect(whitelistSpy).not.toHaveBeenCalled();

      const task = await response.json();
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('durationMinutes');
    });

    it('enforces whitelist and blocks unauthenticated POST when flag is disabled', async () => {
      process.env.NEXT_PUBLIC_ALLOW_PUBLIC_UNSTICK = 'false';

      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockRejectedValue(
        new Error('Unauthorized: No active session')
      );

      const request = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await unstickApiPost(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });
});
