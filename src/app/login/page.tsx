import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { createClient } from '@/lib/supabase/server';
import { LOGIN_MESSAGES, loginErrorCode, messageFor } from '@/lib/auth-errors';

async function signIn(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Pass the real reason to the screen, so a wrong password, a missing password and a bad API key look different.
    const code = loginErrorCode(error.message);
    const detail = encodeURIComponent(error.message.slice(0, 160));
    redirect(`/login?error=${code}&detail=${detail}`);
  }

  redirect('/dashboard');
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; detail?: string; reset?: string };
}) {
  const errorText = messageFor(LOGIN_MESSAGES, searchParams.error, LOGIN_MESSAGES.other);

  return (
    <AuthShell title="Shipping Hub" subtitle="سجّل دخولك لمتابعة الشحنات">
      {searchParams.reset ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          تم تعيين كلمة المرور. سجّل دخولك بيها.
        </p>
      ) : null}

      <form action={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            البريد الإلكتروني
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="w-full" dir="ltr" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full"
            dir="ltr"
          />
          <div className="mt-1.5 text-end">
            <Link href="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
        </div>

        {errorText ? (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <p>{errorText}</p>
            {searchParams.detail ? (
              <p dir="ltr" className="mt-1 break-words text-xs text-rose-500">
                {searchParams.detail}
              </p>
            ) : null}
          </div>
        ) : null}

        <button type="submit" className="btn-primary w-full">
          دخول
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        الحسابات بتتضاف من الأدمن بدعوة على الإيميل. لو مش عندك حساب، كلّم المسؤول.
      </p>
    </AuthShell>
  );
}
