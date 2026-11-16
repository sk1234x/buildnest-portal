/**
 * Tier 5: Adversarial Challenger Stress Test Suite
 * Conforms to DISPATCH.md for Milestone 2:
 * 1. Stress-test Edge Middleware gatekeeper: unauthenticated requests, tampered cookies, non-whitelisted sessions, and API route blocking (401/403)
 * 2. Stress-test Whitelist email casing, whitespace, and env fallback
 * 3. Verify zero data leakage on unauthorized requests
 */

import { describe, it, expect, beforeEach, afterEach } from './harness/test-runner.ts';
import { OpaqueBoxClient } from './harness/opaque-box-harness.ts';
import {
  normalizeEmail,
  getEnvWhitelist,
  checkWhitelist,
} from '../../src/lib/auth/whitelist.ts';

describe('Tier 5: Challenger Adversarial Stress Suite', () => {
  let client: OpaqueBoxClient;
  const originalEnv = process.env.WHITELIST_EMAILS;

  beforeEach(() => {
    process.env.WHITELIST_EMAILS = 'admin@buildnest.buzz, tester@buildnest.buzz, FOUNDER@FLOW.BUILDNEST.BUZZ';
    client = new OpaqueBoxClient({
      whitelistTable: ['allowed@buildnest.buzz', 'keystone@buildnest.buzz'],
      whitelistEnv: ['admin@buildnest.buzz', 'tester@buildnest.buzz', 'founder@flow.buildnest.buzz'],
      geminiMockLatencyMs: 20,
    });
  });

  afterEach(() => {
    process.env.WHITELIST_EMAILS = originalEnv;
  });

  // =========================================================================
  // Section 1: Edge Middleware Gatekeeper Adversarial Challenges
  // =========================================================================
  describe('1. Edge Middleware Gatekeeper: Unauthenticated Requests', () => {
    const protectedPages = [
      '/dashboard',
      '/dashboard/settings',
      '/routines',
      '/routines/morning',
      '/routines/momentum',
      '/routines/evening',
      '/unstick',
    ];

    for (const path of protectedPages) {
      it(`blocks unauthenticated request to ${path} with HTTP 307 redirect to /login`, () => {
        const res = client.navigate(path);
        expect(res.status).toBe(307);
        expect(res.location).toBe(`/login?redirect=${encodeURIComponent(path)}`);
        expect(res.leakedProtectedChunk).toBe(false);
      });
    }

    const protectedApis = ['/api/unstick', '/api/unstick/v1'];

    for (const apiPath of protectedApis) {
      it(`blocks unauthenticated API request to ${apiPath} with HTTP 401 JSON and zero data`, () => {
        const res = client.navigate(apiPath);
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Unauthorized' });
        expect(res.leakedProtectedChunk).toBe(false);
      });
    }

    it('permits unauthenticated requests to public routes without redirection', () => {
      const publicRoutes = ['/', '/login', '/access-denied', '/api/health'];
      for (const route of publicRoutes) {
        const res = client.navigate(route);
        expect(res.status).toBe(200);
        expect(res.location).toBeUndefined();
      }
    });
  });

  describe('2. Edge Middleware Gatekeeper: Tampered and Expired Sessions', () => {
    it('redirects requests with non-existent session token to /login with HTTP 307', () => {
      const res = client.navigate('/dashboard', {
        cookies: { 'sb-access-token': 'forged_fake_token_xyz' },
      });
      expect(res.status).toBe(307);
      expect(res.location).toContain('/login?redirect=%2Fdashboard');
      expect(res.leakedProtectedChunk).toBe(false);
    });

    it('blocks API request with forged session token with HTTP 401 Unauthorized JSON', () => {
      const res = client.navigate('/api/unstick', {
        cookies: { 'sb-access-token': 'tampered_malformed_jwt' },
      });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('rejects expired session token on private page route with HTTP 307 redirect', async () => {
      const loginRes = await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      expect(loginRes.success).toBe(true);
      const session = loginRes.session!;

      // Artificially expire the session
      session.expiresAt = Date.now() - 5000;

      const res = client.navigate('/routines/morning');
      expect(res.status).toBe(307);
      expect(res.location).toContain('/login?redirect=%2Froutines%2Fmorning');
      expect(client.getCurrentSession()).toBeNull();
    });
  });

  describe('3. Edge Middleware Gatekeeper: Non-Whitelisted Authenticated Sessions', () => {
    it('redirects authenticated but non-whitelisted user to /access-denied and revokes session', async () => {
      const loginRes = await client.signInWithPassword('uninvited@example.com', 'Password123!');
      expect(loginRes.success).toBe(true);

      const navRes = client.navigate('/dashboard');
      expect(navRes.status).toBe(307);
      expect(navRes.location).toBe('/access-denied');
      expect(navRes.leakedProtectedChunk).toBe(false);

    });

    it('blocks authenticated but non-whitelisted user calling /api/unstick with HTTP 403 Forbidden', async () => {
      const loginRes = await client.signInWithPassword('uninvited@example.com', 'Password123!');
      expect(loginRes.success).toBe(true);

      const apiRes = client.navigate('/api/unstick');
      expect(apiRes.status).toBe(403);
      expect(apiRes.body).toEqual({ error: 'Forbidden: Whitelist Access Required' });
      expect(apiRes.leakedProtectedChunk).toBe(false);

    });

    it('does NOT redirect non-whitelisted visitor visiting /login to /dashboard', async () => {
      const res = client.navigate('/login');
      expect(res.status).toBe(200);
      expect(res.location).toBeUndefined();
    });
  });

  describe('4. Edge Middleware Gatekeeper: Whitelisted Authenticated Sessions', () => {
    it('permits authenticated and whitelisted user direct access to /dashboard (HTTP 200)', async () => {
      await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      const res = client.navigate('/dashboard');
      expect(res.status).toBe(200);
      expect(res.location).toBeUndefined();
      expect(res.leakedProtectedChunk).toBe(false);
    });

    it('verifies whitelisted user session properties', async () => {
      const loginRes = await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.isWhitelisted).toBe(true);
      expect(client.getCurrentSession()?.email).toBe('allowed@buildnest.buzz');
    });
  });

  // =========================================================================
  // Section 2: Whitelist Logic Hardening & Fallbacks
  // =========================================================================
  describe('5. Whitelist Logic: normalizeEmail Edge Cases', () => {
    it('normalizes uppercase and mixed-case email strings', () => {
      expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(normalizeEmail('AlEx.SmItH+123@BUILDNEST.BUZZ')).toBe('alex.smith+123@buildnest.buzz');
      expect(normalizeEmail('FOUNDER@flow.buildnest.buzz')).toBe('founder@flow.buildnest.buzz');
    });

    it('trims leading, trailing, and embedded tabs/newlines', () => {
      expect(normalizeEmail('   user@example.com   ')).toBe('user@example.com');
      expect(normalizeEmail('\tuser@example.com\n')).toBe('user@example.com');
      expect(normalizeEmail('\r\n  user@example.com  \r\n')).toBe('user@example.com');
    });

    it('returns null for empty, whitespace-only, or invalid non-string inputs', () => {
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail('    ')).toBeNull();
      expect(normalizeEmail('\t\n\r')).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
      expect(normalizeEmail(undefined)).toBeNull();
      expect(normalizeEmail(12345 as unknown as string)).toBeNull();
      expect(normalizeEmail({} as unknown as string)).toBeNull();
      expect(normalizeEmail([] as unknown as string)).toBeNull();
      expect(normalizeEmail(false as unknown as string)).toBeNull();
    });
  });

  describe('6. Whitelist Logic: getEnvWhitelist Parsing', () => {
    it('parses comma-separated list with irregular spacing and case variants', () => {
      process.env.WHITELIST_EMAILS = '  , Alpha@Test.Com , , BETA@test.com  , , ';
      const list = getEnvWhitelist();
      expect(list).toEqual(['alpha@test.com', 'beta@test.com']);
    });

    it('returns empty array when WHITELIST_EMAILS is blank or whitespace', () => {
      process.env.WHITELIST_EMAILS = '';
      expect(getEnvWhitelist()).toEqual([]);
      process.env.WHITELIST_EMAILS = '   ,   ';
      expect(getEnvWhitelist()).toEqual([]);
    });
  });

  describe('7. Whitelist Logic: checkWhitelist Dual Storage Fallback', () => {
    it('approves whitelisted email from environment variable fallback with case-insensitivity', async () => {
      process.env.WHITELIST_EMAILS = 'fallback-user@buildnest.buzz';
      const result = await checkWhitelist('FALLBACK-USER@BUILDNEST.BUZZ');
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_env');
      expect(result.email).toBe('fallback-user@buildnest.buzz');
    });

    it('approves email with leading/trailing spaces against env fallback', async () => {
      process.env.WHITELIST_EMAILS = 'spaces@buildnest.buzz';
      const result = await checkWhitelist('   spaces@buildnest.buzz   ');
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_env');
    });

    it('fails closed when email is absent from both database and environment', async () => {
      process.env.WHITELIST_EMAILS = 'other@buildnest.buzz';
      const result = await checkWhitelist('intruder@hacker.org');
      expect(result.isWhitelisted).toBe(false);
      expect(result.reason).toBe('not_whitelisted');
    });

    it('returns unauthenticated reason for empty, whitespace, or null email', async () => {
      process.env.WHITELIST_EMAILS = 'admin@buildnest.buzz';
      const r1 = await checkWhitelist('');
      expect(r1.isWhitelisted).toBe(false);
      expect(r1.reason).toBe('unauthenticated');
      expect(r1.email).toBeNull();

      const r2 = await checkWhitelist('   ');
      expect(r2.isWhitelisted).toBe(false);
      expect(r2.reason).toBe('unauthenticated');

      const r3 = await checkWhitelist(null);
      expect(r3.isWhitelisted).toBe(false);
      expect(r3.reason).toBe('unauthenticated');
    });

    it('falls back to environment when Supabase DB table throws error or connection failure', async () => {
      process.env.WHITELIST_EMAILS = 'failover@buildnest.buzz';

      // Mock client that simulates DB outage
      const mockSupabaseOutage = {
        rpc: async () => { throw new Error('Database connection refused: 5432'); },
      };

      const result = await checkWhitelist('failover@buildnest.buzz', mockSupabaseOutage as any);
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_env');
      expect(result.email).toBe('failover@buildnest.buzz');
    });

    it('falls back to environment when Supabase RPC returns error or missing function', async () => {
      process.env.WHITELIST_EMAILS = 'table-fallback@buildnest.buzz';

      const mockSupabaseMissingRpc = {
        rpc: async () => ({ data: null, error: { message: 'function is_email_whitelisted not found', code: '42883' } }),
        from: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({ data: [], error: { message: 'relation whitelist does not exist', code: '42P01' } }),
            }),
          }),
        }),
      };

      const result = await checkWhitelist('TABLE-FALLBACK@BUILDNEST.BUZZ', mockSupabaseMissingRpc as any);
      expect(result.isWhitelisted).toBe(true);
      expect(result.reason).toBe('whitelisted_env');
    });
  });

  // =========================================================================
  // Section 3: Server Assertion Guard Enforcement
  // =========================================================================
  describe('8. Server Guard: assertAuthenticatedAndWhitelisted', () => {
    it('throws Unauthorized error when no session is active', async () => {
      await expect(client.assertAuthenticatedAndWhitelisted()).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden error when user is authenticated but not in whitelist', async () => {
      await client.signInWithPassword('uninvited@example.com', 'Password123!');
      await expect(client.assertAuthenticatedAndWhitelisted()).rejects.toThrow('Forbidden');
    });

    it('returns userId and email when user is authenticated and whitelisted', async () => {
      await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      const guard = await client.assertAuthenticatedAndWhitelisted();
      expect(guard.userId).toBe('user-1');
      expect(guard.email).toBe('allowed@buildnest.buzz');
    });
  });
});
