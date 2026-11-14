import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { formatDate, formatInt, formatMoney } from '@/lib/format';
import { STATUSES, STATUS_LABELS, isStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = {
  company?: string;
  status?: string;
  q?: string;
  late?: string;
  page?: string;
};

// Strips characters that would break the PostgREST "or" filter syntax.
function cleanSearch(value: string) {
  return value.replace(/[,()*%]/g, ' ').trim().slice(0, 80);
}

export default async function ShipmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await getCurrentProfile();

  const companyId = searchParams.company ?? '';
  const status = searchParams.status ?? '';
  const q = cleanSearch(searchParams.q ?? '');
  const onlyLate = searchParams.late === '1';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const [companiesRes, settingRes] = await Promise.all([
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('app_settings').select('value').eq('key', 'late_after_days').maybeSingle(),
  ]);
  const lateDays = Number(settingRes.data?.value ?? 3);
  const cutoff = new Date(Date.now() - lateDays * 86400000).toISOString();

  let query = supabase
    .from('shipments')
    .select(
      'id, awb, reference, status, raw_status, shipped_at, last_status_at, shipping_cost, companies(name), branches(name), agents(name)',
      { count: 'exact' },
    );

  if (companyId) query = query.eq('company_id', companyId);
  if (status && isStatus(status)) query = query.eq('status', status);
  if (q) query = query.or(`awb.ilike.%${q}%,reference.ilike.%${q}%`);
  if (onlyLate) {
    query = query.not('status', 'in', '(delivered,returned,cancelled)').lt('shipped_at', cutoff);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order('last_status_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as any[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(next: number) {
    const params = new URLSearchParams();
    if (companyId) params.set('company', companyId);
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (onlyLate) params.set('late', '1');
    params.set('page', String(next));
    return `/shipments?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="متابعة الشحنات"
        description={`${formatInt(total)} شحنة بالفلاتر الحالية`}
        actions={
          <Link href="/import" className="btn-ghost">
            استيراد ملف
          </Link>
        }
      />

      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-5" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث برقم الشحنة أو المرجع"
          className="md:col-span-2"
          dir="ltr"
        />
        <select name="company" defaultValue={companyId}>
          <option value="">كل الشركات</option>
          {(companiesRes.data ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status}>
          <option value="">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="late" value="1" defaultChecked={onlyLate} className="h-4 w-4" />
            المتأخرة بس
          </label>
          <button type="submit" className="btn-primary ms-auto">
            فلترة
          </button>
        </div>
      </form>

      <section className="card overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-rose-700">حصلت مشكلة في تحميل الشحنات. حاول تاني.</div>
        ) : rows.length === 0 ? (
          <EmptyState title="مفيش شحنات بالفلاتر دي" text="جرّب تغيّر الفلاتر، أو استورد ملف جديد." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>رقم الشحنة</th>
                  <th>المرجع</th>
                  <th>الشركة</th>
                  <th>الفرع</th>
                  <th>المندوب</th>
                  <th>الحالة</th>
                  <th>تاريخ الشحن</th>
                  <th>آخر تحديث</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isLate =
                    r.shipped_at && !['delivered', 'returned', 'cancelled'].includes(r.status) && r.shipped_at < cutoff;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td>
                        <Link href={`/shipments/${r.id}`} className="num font-semibold text-brand-700 hover:underline" dir="ltr">
                          {r.awb}
                        </Link>
                      </td>
                      <td className="num text-slate-600" dir="ltr">{r.reference ?? '—'}</td>
                      <td>{r.companies?.name ?? '—'}</td>
                      <td>{r.branches?.name ?? '—'}</td>
                      <td>{r.agents?.name ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          {isLate ? <span className="text-xs font-semibold text-rose-600">متأخرة</span> : null}
                        </div>
                      </td>
                      <td className="num">{formatDate(r.shipped_at)}</td>
                      <td className="num">{formatDate(r.last_status_at)}</td>
                      <td className="num">{formatMoney(r.shipping_cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            <span className="text-slate-500">
              صفحة {formatInt(page)} من {formatInt(pages)}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-ghost">
                  السابق
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn-ghost">
                  التالي
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
