import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { messageFor } from '@/lib/auth-errors';
import { createClient } from '@/lib/supabase/server';
import { updatePassword } from './actions';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  short: 'كلمة المرور لازم تكون 8 حروف على الأقل.',
  mismatch: 'كلمتين المرور مش متطابقين.',
  save: 'ما قدرناش نحفظ كلمة المرور. حاول تاني، ولو فضلت المشكلة اطلب رابط جديد.',
};

export default async function UpdatePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session means the link was missing, expired, or already used.
  if (!user) redirect('/login?error=expired');

  const errorText = messageFor(ERRORS, searchParams.error);

  return (
    <AuthShell title="اختار كلمة المرور" subtitle="اختار كلمة مرور جديدة لحسابك">
      <p className="mb-4 text-center text-sm text-slate-500">
        الحساب: <span dir="ltr" className="font-semibold text-slate-700">{user.email}</span>
      </p>

      <form action={updatePassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            كلمة المرور الجديدة
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-slate-400">8 حروف على الأقل.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
            تأكيد كلمة المرور
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full"
            dir="ltr"
          />
        </div>

        {errorText ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorText}</p> : null}

        <button type="submit" className="btn-primary w-full">
          حفظ كلمة المرور
        </button>
      </form>
    </AuthShell>
  );
}
