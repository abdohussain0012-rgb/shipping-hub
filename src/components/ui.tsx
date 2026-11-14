import { STATUS_LABELS, type Status } from '@/lib/status';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const accent = {
    default: 'text-slate-900',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-rose-600',
  }[tone];

  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`kpi-value mt-2 ${accent}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<Status, string> = {
  pending_pickup: 'bg-slate-100 text-slate-700',
  in_transit: 'bg-sky-100 text-sky-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  returned: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: string }) {
  const known = status in STATUS_LABELS;
  const label = known ? STATUS_LABELS[status as Status] : status;
  const style = known ? STATUS_STYLES[status as Status] : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-2 text-base font-semibold text-slate-700">{title}</div>
      {text ? <div className="max-w-md text-sm text-slate-500">{text}</div> : null}
    </div>
  );
}
