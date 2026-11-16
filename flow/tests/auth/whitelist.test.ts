import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeEmail,
  getEnvWhitelist,
  checkWhitelist,
  isEmailWhitelisted,
  isWhitelistedEmail,
  assertAuthenticatedAndWhitelisted,
} from '@/lib/auth/whitelist';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Whitelist Service: Email Normalization', () => {
  it('converts mixed case emails to lowercase', () => {
    expect(normalizeEmail('Test.User@BuildNest.Buzz')).toBe('test.user@buildnest.buzz');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeEmail('   founder@buildnest.buzz   ')).toBe('founder@buildnest.buzz');
  });

  it('returns null for null, undefined, empty, or whitespace-only inputs', () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
  });
});

describe('Whitelist Service: Environment Variable Fallback', () => {
  const originalEnv = process.env.WHITELIST_EMAILS;

  beforeEach(() => {
    process.env.WHITELIST_EMAILS = 'sk@buildnest.buzz, admin@buildnest.buzz , tester@flow.buildnest.buzz';
  });

  it('parses comma-separated emails and trims elements', () => {
    const list = getEnvWhitelist();
    expect(list).toEqual(['sk@buildnest.buzz', 'admin@buildnest.buzz', 'tester@flow.buildnest.buzz']);
  });

  it('approves an email matching WHITELIST_EMAILS with reason whitelisted_env', async () => {
    const result = await checkWhitelist('SK@BUILDNEST.BUZZ');
    expect(result.isWhitelisted).toBe(true);
    expect(result.reason).toBe('whitelisted_env');
    expect(result.email).toBe('sk@buildnest.buzz');
  });

  it('rejects an email absent from both environment and empty database', async () => {
    const result = await checkWhitelist('uninvited-intruder@gmail.com');
    expect(result.isWhitelisted).toBe(false);
    expect(result.reason).toBe('not_whitelisted');
  });

  it('returns unauthenticated reason for empty or missing email', async () => {
    const result = await checkWhitelist('');
    expect(result.isWhitelisted).toBe(false);
    expect(result.reason).toBe('unauthenticated');
    expect(result.email).toBeNull();
  });
});

describe('Whitelist Service: Supabase Database Integration', () => {
  beforeEach(() => {
    delete process.env.WHITELIST_EMAILS;
  });

  it('approves email via RPC function is_email_whitelisted with reason whitelisted_db', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;

    const result = await checkWhitelist('partner@buildnest.buzz', mockSupabase);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('is_email_whitelisted', {
      lookup_email: 'partner@buildnest.buzz',
    });
    expect(result.isWhitelisted).toBe(true);
    expect(result.reason).toBe('whitelisted_db');
  });

  it('falls back to table query when RPC returns false or errors', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'wl-1', email: 'collab@buildnest.buzz' }],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await checkWhitelist('collab@buildnest.buzz', mockSupabase);
    expect(result.isWhitelisted).toBe(true);
    expect(result.reason).toBe('whitelisted_db');
  });

  it('fails closed (returns false) when Supabase encounters an unexpected network/DB error', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockRejectedValue(new Error('Connection reset by peer')),
    } as unknown as SupabaseClient;

    const result = await checkWhitelist('user@domain.com', mockSupabase);
    expect(result.isWhitelisted).toBe(false);
    expect(result.reason).toBe('not_whitelisted');
  });

  it('evaluates isEmailWhitelisted and isWhitelistedEmail convenience helpers accurately', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;

    const res1 = await isEmailWhitelisted('approved@buildnest.buzz', mockSupabase);
    const res2 = await isWhitelistedEmail(mockSupabase, 'approved@buildnest.buzz');
    expect(res1).toBe(true);
    expect(res2).toBe(true);
  });
});

describe('Whitelist Service: Server-side Assertion Guard', () => {
  it('throws Unauthorized error when no active user session exists', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
      },
    } as unknown as SupabaseClient;

    await expect(assertAuthenticatedAndWhitelisted(mockClient)).rejects.toThrow(
      'Unauthorized: No active session'
    );
  });

  it('throws Forbidden error when user exists but email is not whitelisted', async () => {
    process.env.WHITELIST_EMAILS = 'admin@buildnest.buzz';

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-99', email: 'intruder@unknown.com' } },
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
    } as unknown as SupabaseClient;

    await expect(assertAuthenticatedAndWhitelisted(mockClient)).rejects.toThrow(
      'Forbidden: User email is not whitelisted'
    );
  });

  it('returns userId and email when user is authenticated and whitelisted', async () => {
    process.env.WHITELIST_EMAILS = 'authorized@buildnest.buzz';

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123', email: 'authorized@buildnest.buzz' } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const auth = await assertAuthenticatedAndWhitelisted(mockClient);
    expect(auth.userId).toBe('usr-123');
    expect(auth.email).toBe('authorized@buildnest.buzz');
  });
});
