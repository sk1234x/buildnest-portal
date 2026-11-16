import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MiddlewareSupabaseResult {
  supabase: SupabaseClient;
  response: NextResponse;
}

export function createMiddlewareClient(
  request: NextRequest,
  initialResponse?: NextResponse
): MiddlewareSupabaseResult {
  const response =
    initialResponse ||
    NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-test.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-for-tests';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}

export const createClient = createMiddlewareClient;
