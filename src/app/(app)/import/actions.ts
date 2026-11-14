'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile, canImport } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { mapHeaders, parseDate, parseMoney } from '@/lib/import-schema';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CHUNK = 500;

type Record_ = Record<string, unknown>;

function chunks<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Imports one courier's export. Rows are matched by (company, AWB), so re-importing updates them.
// Each status change is written to the audit trail by the database trigger.
export async function importShipments(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  if (!canImport(profile.role)) redirect('/dashboard');

  const companyId = String(formData.get('company_id') ?? '');
  const file = formData.get('file');

  if (!companyId) redirect('/import?error=company');
  if (!(file instanceof File) || file.size === 0) redirect('/import?error=file');
  if (file.size > MAX_FILE_BYTES) redirect('/import?error=size');

  const rows = parseCsv(await file.text());
  if (rows.length < 2) redirect('/import?error=empty');

  const columns = mapHeaders(rows[0]);
  if (columns.awb === undefined) redirect('/import?error=awb');
  if (columns.status === undefined) redirect('/import?error=status');

  // Raw status text -> normalized status, for this courier only.
  const { data: maps } = await supabase
    .from('status_map')
    .select('raw_status, status')
    .eq('company_id', companyId);
  const statusMap = new Map<string, string>();
  for (const m of maps ?? []) statusMap.set(String(m.raw_status).trim().toLowerCase(), m.status);

  // Branches and agents are created on the fly, then looked up by name.
  const branchNames = new Set<string>();
  const agentNames = new Set<string>();
  for (const row of rows.slice(1)) {
    if (columns.branch !== undefined && row[columns.branch]?.trim()) branchNames.add(row[columns.branch].trim());
    if (columns.agent !== undefined && row[columns.agent]?.trim()) agentNames.add(row[columns.agent].trim());
  }

  if (branchNames.size) {
    await supabase
      .from('branches')
      .upsert([...branchNames].map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true });
  }
  if (agentNames.size) {
    await supabase
      .from('agents')
      .upsert([...agentNames].map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true });
  }

  const { data: branchRows } = await supabase.from('branches').select('id, name');
  const { data: agentRows } = await supabase.from('agents').select('id, name');
  const branchIds = new Map((branchRows ?? []).map((b: any) => [b.name, b.id]));
  const agentIds = new Map((agentRows ?? []).map((a: any) => [a.name, a.id]));

  // Build one record per AWB (the last row wins if the file repeats an AWB).
  const byAwb = new Map<string, Record_>();
  const unmapped = new Set<string>();
  let invalid = 0;
  let skippedStatus = 0;

  for (const row of rows.slice(1)) {
    const get = (field: string) => (columns[field] === undefined ? '' : (row[columns[field]] ?? '').trim());

    const awb = get('awb');
    if (!awb) {
      invalid++;
      continue;
    }

    const rawStatus = get('status');
    const status = statusMap.get(rawStatus.toLowerCase());
    if (!status) {
      if (rawStatus) unmapped.add(rawStatus);
      skippedStatus++;
      continue;
    }

    const record: Record_ = {
      company_id: companyId,
      awb,
      raw_status: rawStatus,
      status,
    };

    const reference = get('reference');
    if (reference) record.reference = reference;

    const branch = get('branch');
    if (branch && branchIds.has(branch)) record.branch_id = branchIds.get(branch);

    const agent = get('agent');
    if (agent && agentIds.has(agent)) record.agent_id = agentIds.get(agent);

    for (const money of ['order_value', 'shipping_cost', 'cod_amount'] as const) {
      const parsed = parseMoney(get(money));
      if (parsed === null) {
        invalid++;
        continue;
      }
      if (parsed !== undefined) record[money] = parsed;
    }

    for (const dateField of ['shipped_at', 'delivered_at'] as const) {
      const parsed = parseDate(get(dateField));
      if (parsed === null) {
        invalid++;
        continue;
      }
      if (parsed !== undefined) record[dateField] = parsed;
    }

    byAwb.set(awb, record);
  }

  // Rows with the same set of columns go in one upsert, so empty cells never erase existing values.
  const groups = new Map<string, Record_[]>();
  for (const record of byAwb.values()) {
    const signature = Object.keys(record).sort().join('|');
    const list = groups.get(signature) ?? [];
    list.push(record);
    groups.set(signature, list);
  }

  let written = 0;
  let failed = 0;
  for (const list of groups.values()) {
    for (const batch of chunks(list, CHUNK)) {
      const { error } = await supabase.from('shipments').upsert(batch, { onConflict: 'company_id,awb' });
      if (error) failed += batch.length;
      else written += batch.length;
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/shipments');
  revalidatePath('/reports');

  const params = new URLSearchParams({
    ok: '1',
    written: String(written),
    failed: String(failed),
    invalid: String(invalid),
    skipped: String(skippedStatus),
    unmapped: [...unmapped].slice(0, 15).join(' | '),
  });
  redirect(`/import?${params.toString()}`);
}
