'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (email) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) console.error('[forgot-password]', error.message);
  }

  // Same answer whether or not the account exists, so this form cannot be used to check who is on the team.
  redirect('/forgot-password?sent=1');
}
