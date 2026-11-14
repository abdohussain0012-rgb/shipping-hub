import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { PageHeader, StatusBadge } from '@/components/ui';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { STATUSES, STATUS_LABELS } from '@/lib/status';
import { updateShipmentStatus } from '../actions';

export const dynamic = 'force-dynamic';

const ERROR_TEXT: Record<string, string> = {
  status: 'الحالة اللي اخترتها مش صحيحة.',
  notfound: 'الشحنة دي مش موجودة.',
  save: 'الحالة متحفظتش. حاول تاني.',
  note: 'الشحنة اتحدثت لكن الملاحظة متحفظتش.',
};

export default async function ShipmentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const { supabase } = await getCurrentProfile();

  const [shipmentRes, eventsRes] = await Promise.all([
    supabase
      .from('shipments')
      .select(
        'id, awb, reference, raw_status, status, order_value, shipping_cost, cod_amount, shipped_at, delivered_at, last_status_at, created_at, companies(name), branches(name), agents(name)',
      )
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('shipment_events')
      .select('id, status, raw_status, note, created_at, profiles(full_name)')
      .eq('shipment_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  const s = shipmentRes.data as any;
  if (!s) notFound();

  const events = (eventsRes.data ?? []) as any[];

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/shipments" className="text-brand-700 hover:underline">
          ← رجوع للشحنات
        </Link>
      </div>

      <PageHeader
        title={`شحنة ${s.awb}`}
        description={`${s.companies?.name ?? ''} · المرجع ${s.reference ?? '—'}`}
        actions={<StatusBadge status={s.status} />}
      />

      {searchParams.saved ? (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">تم الحفظ.</div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {ERROR_TEXT[searchParams.error] ?? 'حصلت مشكلة. حاول تاني.'}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold">بيانات الشحنة</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-slate-500">الفرع</dt>
              <dd className="mt-1 font-semibold">{s.branches?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">المندوب</dt>
              <dd className="mt-1 font-semibold">{s.agents?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">حالة الشركة الأصلية</dt>
              <dd className="mt-1 font-semibold">{s.raw_status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">تاريخ الشحن</dt>
              <dd className="num mt-1">{formatDate(s.shipped_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">تاريخ التسليم</dt>
              <dd className="num mt-1">{formatDate(s.delivered_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">آخر تحديث</dt>
              <dd className="num mt-1">{formatDateTime(s.last_status_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">قيمة الأوردر</dt>
              <dd className="num mt-1">{formatMoney(s.order_value)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">تكلفة الشحن</dt>
              <dd className="num mt-1">{formatMoney(s.shipping_cost)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">التحصيل عند الاستلام</dt>
              <dd className="num mt-1">{formatMoney(s.cod_amount)}</dd>
            </div>
          </dl>

          <h2 className="mb-4 mt-8 font-bold">سجل الشحنة</h2>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">مفيش أحداث مسجلة لسه.</p>
          ) : (
            <ol className="relative space-y-4 border-s-2 border-slate-100 ps-6">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -start-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    {e.status ? <StatusBadge status={e.status} /> : <span className="text-sm font-semibold">ملاحظة</span>}
                    <span className="text-xs text-slate-500">
                      {e.profiles?.full_name ?? 'النظام'} · {formatDateTime(e.created_at)}
                    </span>
                  </div>
                  {e.note ? <p className="mt-1 text-sm text-slate-700">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card h-fit p-5">
          <h2 className="mb-4 font-bold">تحديث الحالة</h2>
          <form action={updateShipmentStatus} className="space-y-4">
            <input type="hidden" name="id" value={s.id} />
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                الحالة الجديدة
              </label>
              <select id="status" name="status" defaultValue={s.status} className="w-full">
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="mb-1 block text-sm font-medium">
                ملاحظة (اختياري)
              </label>
              <textarea id="note" name="note" rows={3} maxLength={500} className="w-full" placeholder="مثال: العميل طلب يتأجل لبكرة" />
            </div>
            <button type="submit" className="btn-primary w-full">
              حفظ
            </button>
            <p className="text-xs text-slate-400">كل تغيير بيتسجل في السجل باسمك ووقته.</p>
          </form>
        </section>
      </div>
    </>
  );
}
