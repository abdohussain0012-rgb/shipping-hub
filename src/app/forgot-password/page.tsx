import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { requestPasswordReset } from './actions';

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string } }) {
  return (
    <AuthShell title="نسيت كلمة المرور؟" subtitle="هنبعتلك رابط تعيين كلمة مرور جديدة على الإيميل">
      {searchParams.sent ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            لو الإيميل ده مسجّل عندنا، هيوصلك رابط خلال دقايق. لو مش لاقيه، شوف فولدر Spam.
          </p>
          <Link href="/login" className="btn-ghost w-full">
            رجوع لتسجيل الدخول
          </Link>
        </div>
      ) : (
        <form action={requestPasswordReset} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="w-full" dir="ltr" />
          </div>

          <button type="submit" className="btn-primary w-full">
            إرسال الرابط
          </button>

          <div className="text-center">
            <Link href="/login" className="text-xs font-medium text-brand-700 hover:underline">
              رجوع لتسجيل الدخول
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
