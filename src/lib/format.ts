const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Cairo',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Cairo',
});

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
}

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
}

export function formatPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
}

export function formatInt(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('en-US');
}

// Start and end of a date range in Cairo time, from "YYYY-MM-DD" strings.
export function rangeToIso(from: string, to: string) {
  return {
    from: new Date(`${from}T00:00:00+02:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999+02:00`).toISOString(),
  };
}

export function todayCairo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(new Date());
  return parts; // YYYY-MM-DD
}

export function daysAgoCairo(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(d);
}
