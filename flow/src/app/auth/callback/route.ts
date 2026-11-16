import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isEmailWhitelisted } from '@/lib/auth/whitelist';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user || !data.user.email) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    // Boundary 2: Whitelist Gatekeeper Check
    const whitelisted = await isEmailWhitelisted(data.user.email, supabase);

    if (!whitelisted) {
      // Revoke session immediately for uninvited accounts
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue to redirect
      }
      return NextResponse.redirect(`${origin}/login?error=not_whitelisted`);
    }

    // Optional profile upsert for newly whitelisted accounts
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email.split('@')[0],
        avatar_url:
          data.user.user_metadata?.avatar_url ||
          data.user.user_metadata?.picture,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking if table not migrated yet
    }

    // Prevent open redirect by ensuring `next` starts with single '/'
    const safeNext =
      next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
