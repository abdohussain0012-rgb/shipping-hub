// Column names accepted in a courier export (English or Arabic, any case, spaces or underscores).
export const COLUMN_ALIASES: Record<string, string[]> = {
  awb: ['awb', 'awb_number', 'tracking_number', 'tracking', 'waybill', 'hawb', 'رقم_الشحنة'],
  reference: ['reference', 'ref', 'shipper_ref', 'order_number', 'order_no', 'order', 'المرجع'],
  status: ['status', 'raw_status', 'shipment_status', 'الحالة'],
  branch: ['branch', 'store', 'الفرع'],
  agent: ['agent', 'rep', 'representative', 'courier_agent', 'المندوب'],
  order_value: ['order_value', 'order_amount', 'amount', 'قيمة_الأوردر'],
  shipping_cost: ['shipping_cost', 'cost', 'fees', 'total_cost', 'تكلفة_الشحن'],
  cod_amount: ['cod', 'cod_amount', 'collect_amount', 'التحصيل'],
  shipped_at: ['shipped_at', 'ship_date', 'pickup_date', 'date', 'تاريخ_الشحن'],
  delivered_at: ['delivered_at', 'delivery_date', 'تاريخ_التسليم'],
};

export function normalizeHeader(value: string) {
  return value.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, '_');
}

// Maps each canonical field to its column index in the file, if the column exists.
export function mapHeaders(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const found: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalized.findIndex((h) => aliases.includes(h));
    if (index >= 0) found[field] = index;
  }
  return found;
}

// Accepts YYYY-MM-DD (or ISO timestamps) and DD/MM/YYYY (the Egyptian convention).
export function parseDate(value: string): string | null | undefined {
  const v = value.trim();
  if (!v) return undefined;

  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00+02:00`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }

  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export function parseMoney(value: string): number | null | undefined {
  const v = value.replace(/,/g, '').trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
