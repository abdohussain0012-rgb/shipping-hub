import { redirect } from 'next/navigation';
import { canImport, getCurrentProfile } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { formatInt } from '@/lib/format';
import { importShipments } from './actions';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  company: 'اختار الشركة الأول.',
  file: 'اختار ملف CSV.',
  size: 'الملف أكبر من 5 ميجا. قسّمه لملفين أو أكتر.',
  empty: 'الملف فاضي أو مفيهوش صفوف.',
  awb: 'مفيش عمود لرقم الشحنة (awb). شوف الأعمدة المطلوبة تحت.',
  status: 'مفيش عمود للحالة (status). شوف الأعمدة المطلوبة تحت.',
};

const COLUMN_GUIDE = [
  ['awb', 'رقم الشحنة من الشركة', 'مطلوب'],
  ['status', 'الحالة كما تظهر في ملف الشركة', 'مطلوب'],
  ['reference', 'رقم الأوردر أو المرجع', 'اختياري'],
  ['branch', 'اسم الفرع', 'اختياري'],
  ['agent', 'اسم المندوب', 'اختياري'],
  ['order_value', 'قيمة الأوردر (ج.م)', 'اختياري'],
  ['shipping_cost', 'تكلفة الشحن (ج.م)', 'اختياري'],
  ['cod_amount', 'مبلغ التحصيل عند الاستلام', 'اختياري'],
  ['shipped_at', 'تاريخ الشحن (YYYY-MM-DD أو DD/MM/YYYY)', 'اختياري'],
  ['delivered_at', 'تاريخ التسليم', 'اختياري'],
] as const;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { supabase, profile } = await getCurrentProfile();
  if (!canImport(profile.role)) redirect('/dashboard');

  const { data: companies } = await supabase.from('companies').select('id, name').order('name');

  const unmapped = (searchParams.unmapped ?? '').split(' | ').filter(Boolean);
  const errorText = searchParams.error ? ERRORS[searchParams.error] ?? 'حصلت مشكلة. حاول تاني.' : null;

  return (
    <>
      <PageHeader
        title="استيراد ملفات الشركات"
        description="ارفع ملف الشحنات من أي شركة. الشحنات بتتحدث بالرقم (AWB)، ومش بتتكرر."
      />

      {errorText ? <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{errorText}</div> : null}

      {searchParams.ok ? (
        <div className="mb-6 card p-5">
          <h2 className="mb-3 font-bold">نتيجة الاستيراد</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-slate-500">اتحفظ / اتحدّث</dt>
              <dd className="kpi-value mt-1 text-emerald-600">{formatInt(searchParams.written)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">فشل</dt>
              <dd className="kpi-value mt-1 text-rose-600">{formatInt(searchParams.failed)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">حالة مش متعرفة</dt>
              <dd className="kpi-value mt-1 text-amber-600">{formatInt(searchParams.skipped)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">صفوف أو قيم غلط</dt>
              <dd className="kpi-value mt-1">{formatInt(searchParams.invalid)}</dd>
            </div>
          </dl>

          {unmapped.length > 0 ? (
            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="mb-2 font-semibold">
                الحالات دي من الشركة مش متعرفة عندنا، فالشحنات اللي فيها اتسابت. ضيفها من صفحة توحيد الحالات ورفع الملف تاني:
              </p>
              <ul className="list-inside list-disc" dir="ltr">
                {unmapped.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">ارفع ملف</h2>
          <form action={importShipments} className="space-y-4" encType="multipart/form-data">
            <div>
              <label htmlFor="company_id" className="mb-1 block text-sm font-medium">
                الشركة
              </label>
              <select id="company_id" name="company_id" required className="w-full">
                <option value="">اختار الشركة</option>
                {(companies ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="file" className="mb-1 block text-sm font-medium">
                ملف CSV
              </label>
              <input id="file" name="file" type="file" accept=".csv,text/csv" required className="w-full" />
              <p className="mt-1 text-xs text-slate-500">حفظ الملف بصيغة CSV من Excel: File ← Save As ← CSV UTF-8.</p>
            </div>
            <button type="submit" className="btn-primary w-full">
              استيراد
            </button>
          </form>
        </section>

        <section className="card p-6 lg:col-span-3">
          <h2 className="mb-1 font-bold">الأعمدة اللي النظام بيقراها</h2>
          <p className="mb-4 text-sm text-slate-500">
            أسماء الأعمدة ممكن تكون عربي أو إنجليزي، وحروف كبيرة أو صغيرة، ومسافة أو underscore. مش لازم الترتيب.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table>
              <thead>
                <tr>
                  <th>العمود</th>
                  <th>المعنى</th>
                  <th>النوع</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_GUIDE.map(([col, meaning, kind]) => (
                  <tr key={col}>
                    <td className="num font-semibold" dir="ltr">
                      {col}
                    </td>
                    <td>{meaning}</td>
                    <td className={kind === 'مطلوب' ? 'font-semibold text-rose-600' : 'text-slate-500'}>{kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            الحالة الأصلية من الشركة بتتترجم عن طريق صفحة توحيد الحالات. لو ظهرت حالة جديدة، الشحنات اللي فيها بتتخطى ومش بتتسجل لحد ما تضيفها في توحيد الحالات.
          </p>
        </section>
      </div>
    </>
  );
}
