'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile, isAdmin } from '@/lib/auth';
import { isStatus } from '@/lib/status';

export async function addStatusMapping(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  if (!isAdmin(profile.role)) redirect('/dashboard');

  const companyId = String(formData.get('company_id') ?? '');
  const rawStatus = String(formData.get('raw_status') ?? '').trim().slice(0, 120);
  const status = String(formData.get('status') ?? '');

  if (!companyId || !rawStatus || !isStatus(status)) redirect('/settings/status-map?error=invalid');

  const { error } = await supabase
    .from('status_map')
    .upsert({ company_id: companyId, raw_status: rawStatus, status }, { onConflict: 'company_id,raw_status' });

  if (error) redirect('/settings/status-map?error=save');

  revalidatePath('/settings/status-map');
  redirect('/settings/status-map?saved=1');
}

export async function deleteStatusMapping(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  if (!isAdmin(profile.role)) redirect('/dashboard');

  const id = String(formData.get('id') ?? '');
  if (id) {
    await supabase.from('status_map').delete().eq('id', id);
  }

  revalidatePath('/settings/status-map');
  redirect('/settings/status-map');
}
