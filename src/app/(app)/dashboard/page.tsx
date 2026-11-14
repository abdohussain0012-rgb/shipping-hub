import { getCurrentProfile } from '@/lib/auth';
import { EmptyState, KpiCard, PageHeader, StatusBadge } from '@/components/ui';
import {
  daysAgoCairo,
  formatDateTime,
  formatInt,
  formatMoney,
  formatPercent,
  rangeToIso,
  todayCairo,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

type Kpis = {
  total: number;
  open: number;
  late: number;
  delivered_today: number;
  delivery_rate: number;
};

type CompanyRow = {
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

export default async function DashboardPage() {
  const { supabase, profile } = await getCurrentProfile();
  const range = rangeToIso(daysAgoCairo(30), todayCairo());

  const [kpiRes, companyRes, eventsRes] = await Promise.all([
    supabase.rpc('dashboard_kpis'),
    supabase.rpc('report_summary', { dim: 'company', d_from: range.from, d_to: range.to }),
    supabase
      .from('shipment_events')
      .select('id, status, note, created_at, shipments(awb, companies(name)), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const kpis = (kpiRes.data ?? {}) as Partial<Kpis>;
  const companies = (companyRes.data ?? []) as CompanyRow[];
  const events = (eventsRes.data ?? []) as any[];
  const hasError = kpiRes.error || companyRes.error || eventsRes.error;

  return (
    <>
      <PageHeader
        title={`أهلاً ${profile.full_name.split(' ')[0]}`}
        description="ملخص الشغل اليومي: الشحنات المفتوحة، والمتأخرة، ونسبة التسليم."
      />

      {hasError ? (
        <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          حصلت مشكلة في تحميل بعض البيانات. حاول تحدّث الصفحة، ولو استمرت كلّم المسؤول.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="إجمالي الشحنات" value={formatInt(kpis.total)} />
        <KpiCard label="مفتوحة" value={formatInt(kpis.open)} hint="لسه مستنية نتيجة" />
        <KpiCard
          label="متأخرة"
          value={formatInt(kpis.late)}
          tone={(kpis.late ?? 0) > 0 ? 'bad' : 'good'}
          hint="أكتر من المدة المحددة بدون تسليم"
        />
        <KpiCard label="اتسلمت النهارده" value={formatInt(kpis.delivered_today)} tone="good" />
        <KpiCard
          label="نسبة التسليم"
          value={formatPercent(kpis.delivery_rate ?? 0)}
          tone={(kpis.delivery_rate ?? 0) >= 85 ? 'good' : 'warn'}
          hint="من الشحنات المقفولة"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <section className="card xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold">أداء الشركات</h2>
              <p className="text-xs text-slate-500">آخر 30 يوم</p>
            </div>
          </div>
          {companies.length === 0 ? (
            <EmptyState title="مفيش شحنات في الفترة دي" text="استورد ملف من شركة شحن عشان البيانات تظهر هنا." />
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>الشركة</th>
                    <th>الشحنات</th>
                    <th>اتسلمت</th>
                    <th>نسبة التسليم</th>
                    <th>متأخرة</th>
                    <th>إجمالي التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.group_name}>
                      <td className="font-semibold">{c.group_name}</td>
                      <td className="num">{formatInt(c.total)}</td>
                      <td className="num">{formatInt(c.delivered)}</td>
                      <td className="num">{formatPercent(c.delivery_rate)}</td>
                      <td className={`num ${c.late_count > 0 ? 'font-semibold text-rose-600' : ''}`}>
                        {formatInt(c.late_count)}
                      </td>
                      <td className="num">{formatMoney(c.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">آخر التحديثات</h2>
            <p className="text-xs text-slate-500">مين غيّر إيه ووقته</p>
          </div>
          {events.length === 0 ? (
            <EmptyState title="لسه مفيش تحديثات" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-sm font-semibold" dir="ltr">
                      {e.shipments?.awb ?? '—'}
                    </span>
                    {e.status ? <StatusBadge status={e.status} /> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {e.shipments?.companies?.name ?? ''} · {e.profiles?.full_name ?? 'النظام'} · {formatDateTime(e.created_at)}
                  </div>
                  {e.note ? <div className="mt-1 text-xs text-slate-600">{e.note}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
