import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="mb-2 text-xl font-bold">حسابك مش مفعّل</h1>
        <p className="mb-6 text-sm text-slate-600">
          الحساب ده مش مرتبط بملف صلاحيات في النظام. كلّم الأدمن عشان يفعّله.
        </p>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            تسجيل الخروج
          </button>
        </form>
      </div>
    </main>
  );
}
