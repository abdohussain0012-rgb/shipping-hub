'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) redirect('/auth/update-password?error=short');
  if (password !== confirm) redirect('/auth/update-password?error=mismatch');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=expired');

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('[update-password]', error.message);
    redirect('/auth/update-password?error=save');
  }

  // Sign out so the user logs in with the new password, which confirms it works.
  await supabase.auth.signOut();
  redirect('/login?reset=1');
}
