'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { isStatus } from '@/lib/status';

// Manual status change from the shipment page. The database trigger writes the audit event.
export async function updateShipmentStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);

  const { supabase, profile } = await getCurrentProfile();

  if (!id) redirect('/shipments');
  if (!isStatus(status)) redirect(`/shipments/${id}?error=status`);

  const { data: current } = await supabase.from('shipments').select('status').eq('id', id).single();
  if (!current) redirect(`/shipments/${id}?error=notfound`);

  if (current.status !== status) {
    const { error } = await supabase
      .from('shipments')
      .update({
        status,
        delivered_at: status === 'delivered' ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) redirect(`/shipments/${id}?error=save`);
  }

  // A note is stored as its own event so the timeline reads: who, when, what they wrote.
  if (note) {
    const { error } = await supabase.from('shipment_events').insert({
      shipment_id: id,
      note,
      actor_id: profile.id,
    });
    if (error) redirect(`/shipments/${id}?error=note`);
  }

  revalidatePath(`/shipments/${id}`);
  revalidatePath('/shipments');
  revalidatePath('/dashboard');
  redirect(`/shipments/${id}?saved=1`);
}
