'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile, isAdmin } from '@/lib/auth';

const ROLES = ['admin', 'manager', 'agent'] as const;

export async function setUserRole(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  if (!isAdmin(profile.role)) redirect('/dashboard');

  const userId = String(formData.get('user_id') ?? '');
  const role = String(formData.get('role') ?? '');

  if (!userId || !(ROLES as readonly string[]).includes(role)) {
    redirect('/settings/users?error=invalid');
  }
  // Admins cannot change their own role, so the team never ends up without an admin by accident.
  if (userId === profile.id) redirect('/settings/users?error=self');

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) redirect('/settings/users?error=save');

  revalidatePath('/settings/users');
  redirect('/settings/users?saved=1');
}
