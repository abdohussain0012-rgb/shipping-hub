import { redirect } from 'next/navigation';
import { getCurrentProfile, isAdmin } from '@/lib/auth';
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { STATUSES, STATUS_LABELS } from '@/lib/status';
import { addStatusMapping, deleteStatusMapping } from './actions';

export const dynamic = 'force-dynamic';

export default async function StatusMapPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const { supabase, profile } = await getCurrentProfile();
  if (!isAdmin(profile.role)) redirect('/dashboard');

  const [companiesRes, mapsRes] = await Promise.all([
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('status_map').select('id, raw_status, status, company_id, companies(name)').order('raw_status'),
  ]);

  const companies = (companiesRes.data ?? []) as any[];
  const maps = (mapsRes.data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="توحيد الحالات"
        description="كل شركة بتكتب الحالات بطريقتها. هنا بنربط كل حالة من الشركة بحالة موحدة في النظام."
      />

      {searchParams.saved ? (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">تم حفظ التوحيد.</div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {searchParams.error === 'invalid' ? 'اكتب الحالة واختار الشركة والحالة الموحدة.' : 'الحفظ ما نجحش. حاول تاني.'}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">ربط حالة جديدة</h2>
          <form action={addStatusMapping} className="space-y-4">
            <div>
              <label htmlFor="company_id" className="mb-1 block text-sm font-medium">
                الشركة
              </label>
              <select id="company_id" name="company_id" required className="w-full">
                <option value="">اختار الشركة</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="raw_status" className="mb-1 block text-sm font-medium">
                الحالة كما تظهر في ملف الشركة
              </label>
              <input id="raw_status" name="raw_status" required maxLength={120} className="w-full" dir="ltr" placeholder="مثال: Delivered" />
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                تتحول لـ
              </label>
              <select id="status" name="status" required className="w-full">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              حفظ الربط
            </button>
          </form>
        </section>

        <section className="card overflow-hidden lg:col-span-3">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">الربطات الحالية</h2>
          </div>
          {maps.length === 0 ? (
            <EmptyState
              title="مفيش ربطات لسه"
              text="لما تستورد ملف وتظهر حالة مش متعرفة، هتلاقيها في صفحة الاستيراد. ضيفها هنا."
            />
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>الشركة</th>
                    <th>الحالة الأصلية</th>
                    <th>الحالة الموحدة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {maps.map((m) => (
                    <tr key={m.id}>
                      <td>{m.companies?.name ?? '—'}</td>
                      <td className="num" dir="ltr">{m.raw_status}</td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="text-end">
                        <form action={deleteStatusMapping}>
                          <input type="hidden" name="id" value={m.id} />
                          <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                            حذف
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
