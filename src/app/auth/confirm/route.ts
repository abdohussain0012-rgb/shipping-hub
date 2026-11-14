import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabase/env';

// Email links for invites, password resets and sign-ups point here.
// Supabase sends a one-time token_hash. We verify it on the server, store the session in cookies,
// then send the user on to `next`.
const TYPES: EmailOtpType[] = ['invite', 'recovery', 'signup', 'email', 'magiclink', 'email_change'];

// Only allow redirects to paths inside this site (no "https://other.com" and no "//other.com").
function safeNext(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const isSetupLink = type === 'invite' || type === 'recovery';
  const next = safeNext(searchParams.get('next'), isSetupLink ? '/auth/update-password' : '/dashboard');

  // Cookies created during verification are collected here and attached to the final redirect.
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        cookiesToSet.push(...list);
      },
    },
  });

  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error('[auth/confirm]', error.message);
  }

  const response = NextResponse.redirect(new URL(ok ? next : '/login?error=expired', origin));
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
