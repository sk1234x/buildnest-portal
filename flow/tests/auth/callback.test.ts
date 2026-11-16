import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/auth/callback/route';
import * as serverSupabase from '@/lib/supabase/server';
import * as whitelistService from '@/lib/auth/whitelist';

describe('OAuth Callback Route Handler (/auth/callback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createCallbackRequest(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    const url = `http://localhost:3000/auth/callback?${search}`;
    return new NextRequest(url);
  }

  it('exchanges authorization code and redirects whitelisted user to /dashboard', async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-whitelisted',
              email: 'allowed@buildnest.buzz',
              user_metadata: { full_name: 'Approved User' },
            },
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

    const req = createCallbackRequest({ code: 'valid-oauth-auth-code' });
    const res = await GET(req);

    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-oauth-auth-code');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects to safe custom destination provided in next parameter', async () => {
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
      code: 'valid-code',
      next: '/routines/morning',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/routines/morning');
  });

  it('prevents open-redirect vulnerability when malicious next URL is provided', async () => {
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

    // Malicious open redirect attempt
    const req = createCallbackRequest({
      code: 'valid-code',
      next: 'https://evil-phishing.com/steal-creds',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    // Neutralized to internal /dashboard
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('immediately revokes session and redirects uninvited user to /login?error=not_whitelisted', async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'u-uninvited', email: 'intruder@unknown.com' },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);
    vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

    const req = createCallbackRequest({ code: 'oauth-code-uninvited' });
    const res = await GET(req);

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=not_whitelisted');
  });

  it('redirects with error parameter when authorization code is absent', async () => {
    const req = createCallbackRequest({});
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=missing_code');
  });

  it('redirects with auth_failed when Supabase exchangeCodeForSession returns error', async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Invalid authorization code'),
        }),
      },
    };

    vi.spyOn(serverSupabase, 'createClient').mockResolvedValue(mockSupabase as any);

    const req = createCallbackRequest({ code: 'corrupted-or-expired-code' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=auth_failed');
  });
});
