import type { SupabaseClient } from '@supabase/supabase-js';

export interface WhitelistCheckResult {
  isWhitelisted: boolean;
  email: string | null;
  reason?: 'whitelisted_db' | 'whitelisted_env' | 'not_whitelisted' | 'unauthenticated';
}

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses the comma-separated WHITELIST_EMAILS environment variable.
 */
export function getEnvWhitelist(): string[] {
  const raw = process.env.WHITELIST_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Evaluates whitelist status against:
 * 1. Supabase database `public.whitelist` table (or RPC `is_email_whitelisted`)
 * 2. Environment variable `WHITELIST_EMAILS` fallback
 */
export async function checkWhitelist(
  email: string | null | undefined,
  supabase?: SupabaseClient | null
): Promise<WhitelistCheckResult> {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return {
      isWhitelisted: false,
      email: null,
      reason: 'unauthenticated',
    };
  }

  // 1. Query Supabase database if a client is provided
  if (supabase) {
    try {
      // First try RPC security definer function
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'is_email_whitelisted',
        { lookup_email: cleanEmail }
      );

      if (!rpcError && typeof rpcData === 'boolean' && rpcData === true) {
        return {
          isWhitelisted: true,
          email: cleanEmail,
          reason: 'whitelisted_db',
        };
      }

      // If RPC is absent or returns false, query table directly
      const { data: tableData, error: tableError } = await supabase
        .from('whitelist')
        .select('id, email')
        .ilike('email', cleanEmail)
        .limit(1);

      if (!tableError && tableData && tableData.length > 0) {
        return {
          isWhitelisted: true,
          email: cleanEmail,
          reason: 'whitelisted_db',
        };
      }
    } catch {
      // Fail closed to DB error and continue to check ENV fallback
    }
  }

  // 2. Check environment variable fallback (comma-separated)
  const envWhitelist = getEnvWhitelist();
  if (envWhitelist.includes(cleanEmail)) {
    return {
      isWhitelisted: true,
      email: cleanEmail,
      reason: 'whitelisted_env',
    };
  }

  return {
    isWhitelisted: false,
    email: cleanEmail,
    reason: 'not_whitelisted',
  };
}

/**
 * Convenience function matching PROJECT.md interface contract.
 */
export async function isEmailWhitelisted(
  email: string | null | undefined,
  supabase?: SupabaseClient | null
): Promise<boolean> {
  const result = await checkWhitelist(email, supabase);
  return result.isWhitelisted;
}

/**
 * Survey-compatible alias where supabase client is the first parameter.
 */
export async function isWhitelistedEmail(
  supabase: SupabaseClient | null,
  email: string | null | undefined
): Promise<boolean> {
  return isEmailWhitelisted(email, supabase);
}

/**
 * Server-side assertion guard for Route Handlers & Server Actions.
 * Throws an Error if unauthenticated or not whitelisted.
 */
export async function assertAuthenticatedAndWhitelisted(
  customClient?: SupabaseClient | null
): Promise<{ userId: string; email: string }> {
  let supabase = customClient;

  if (!supabase) {
    // Dynamic import to prevent client-side bundling of server cookies
    const { createClient } = await import('@/lib/supabase/server');
    supabase = await createClient();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    throw new Error('Unauthorized: No active session');
  }

  const whitelisted = await isEmailWhitelisted(user.email, supabase);
  if (!whitelisted) {
    throw new Error('Forbidden: User email is not whitelisted');
  }

  return {
    userId: user.id,
    email: user.email,
  };
}
