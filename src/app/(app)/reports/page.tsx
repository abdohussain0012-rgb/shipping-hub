import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { EmptyState, KpiCard, PageHeader } from '@/components/ui';
import {
  daysAgoCairo,
  formatInt,
  formatMoney,
  formatPercent,
  rangeToIso,
  todayCairo,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

const DIMENSIONS = [
  { key: 'company', label: 'الشركات' },
  { key: 'branch', label: 'الفروع' },
  { key: 'agent', label: 'المندوبين' },
] as const;

type Dim = (typeof DIMENSIONS)[number]['key'];

const COLUMN_LABEL: Record<Dim, string> = {
  company: 'الشركة',
  branch: 'الفرع',
  agent: 'المندوب',
};

type ReportRow = {
  group_name: string;
  total: number;
  delivered: number;
  failed: number;
  returned: number;
  open_count: number;
  late_count: number;
  delivery_rate: number;
  total_cost: number;
};

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { dim?: string; from?: string; to?: string };
}) {
  const { supabase } = await getCurrentProfile();

  const dim: Dim = DIMENSIONS.some((d) => d.key === searchParams.dim)
    ? (searchParams.dim as Dim)
    : 'company';
  const from = validDate(searchParams.from) ?? daysAgoCairo(30);
  const to = validDate(searchParams.to) ?? todayCairo();
  const range = rangeToIso(from, to);

  const { data, error } = await supabase.rpc('report_summary', {
    dim,
    d_from: range.from,
    d_to: range.to,
  });
  const rows = (data ?? []) as ReportRow[];

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += Number(r.total);
      acc.delivered += Number(r.delivered);
      acc.failed += Number(r.failed);
      acc.returned += Number(r.returned);
      acc.late += Number(r.late_count);
      acc.cost += Number(r.total_cost);
      return acc;
    },
    { total: 0, delivered: 0, failed: 0, returned: 0, late: 0, cost: 0 },
  );
  const closed = totals.delivered + totals.failed + totals.returned;
  const overallRate = closed === 0 ? 0 : (totals.delivered / closed) * 100;

  const exportHref = `/api/reports/export?dim=${dim}&from=${from}&to=${to}`;
  const dimLabel = DIMENSIONS.find((d) => d.key === dim)?.label ?? '';

  return (
    <>
      <PageHeader
        title="التقارير"
        description={`من ${from} لحد ${to}`}
        actions={
          <a href={exportHref} className="btn-ghost">
            تصدير CSV
          </a>
        }
      />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <input type="hidden" name="dim" value={dim} />
        <div>
          <label htmlFor="from" className="mb-1 block text-xs text-slate-500">
            من
          </label>
          <input id="from" type="date" name="from" defaultValue={from} dir="ltr" />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs text-slate-500">
            لحد
          </label>
          <input id="to" type="date" name="to" defaultValue={to} dir="ltr" />
        </div>
        <button type="submit" className="btn-primary">
          عرض
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {DIMENSIONS.map((d) => (
          <Link
            key={d.key}
            href={`/reports?dim=${d.key}&from=${from}&to=${to}`}
            className={
              d.key === dim
                ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
            }
          >
            {d.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="إجمالي الشحنات" value={formatInt(totals.total)} />
        <KpiCard
          label="نسبة التسليم"
          value={formatPercent(overallRate)}
          tone={overallRate >= 85 ? 'good' : 'warn'}
          hint={`${formatInt(totals.delivered)} من ${formatInt(closed)} شحنة مقفولة`}
        />
        <KpiCard label="متأخرة" value={formatInt(totals.late)} tone={totals.late > 0 ? 'bad' : 'good'} />
        <KpiCard label="إجمالي تكلفة الشحن" value={formatMoney(totals.cost)} />
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold">تفصيل حسب {dimLabel}</h2>
          <p className="text-xs text-slate-500">
            نسبة التسليم = المتسلم ÷ (المتسلم + الفاشل + المرتجع). الشحنات تتحسب بتاريخ الشحن.
          </p>
        </div>

        {error ? (
          <div className="p-6 text-sm text-rose-700">حصلت مشكلة في تحميل التقرير. حاول تاني.</div>
        ) : rows.length === 0 ? (
          <EmptyState title="مفيش بيانات للفترة دي" text="جرّب فترة أوسع، أو استورد ملفات جديدة." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>{COLUMN_LABEL[dim]}</th>
                  <th>الشحنات</th>
                  <th>اتسلمت</th>
                  <th>فشل</th>
                  <th>مرتجع</th>
                  <th>مفتوحة</th>
                  <th>متأخرة</th>
                  <th>نسبة التسليم</th>
                  <th>إجمالي التكلفة</th>
                  <th>متوسط الشحنة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.group_name}>
                    <td className="font-semibold">{r.group_name}</td>
                    <td className="num">{formatInt(r.total)}</td>
                    <td className="num">{formatInt(r.delivered)}</td>
                    <td className="num">{formatInt(r.failed)}</td>
                    <td className="num">{formatInt(r.returned)}</td>
                    <td className="num">{formatInt(r.open_count)}</td>
                    <td className={`num ${r.late_count > 0 ? 'font-semibold text-rose-600' : ''}`}>
                      {formatInt(r.late_count)}
                    </td>
                    <td className="num">{formatPercent(r.delivery_rate)}</td>
                    <td className="num">{formatMoney(r.total_cost)}</td>
                    <td className="num">{formatMoney(Number(r.total) ? Number(r.total_cost) / Number(r.total) : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
