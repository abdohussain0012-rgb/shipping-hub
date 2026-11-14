import { redirect } from 'next/navigation';
import { getCurrentProfile, isAdmin, type Role } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { setUserRole } from './actions';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'أدمن',
  manager: 'مدير',
  agent: 'موظف',
};

const ERRORS: Record<string, string> = {
  invalid: 'الصلاحية مش صحيحة.',
  self: 'مينفعش تغيّر صلاحيتك إنت.',
  save: 'الحفظ ما نجحش. حاول تاني.',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const { supabase, profile } = await getCurrentProfile();
  if (!isAdmin(profile.role)) redirect('/dashboard');

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true });
  const users = (data ?? []) as { id: string; full_name: string; role: Role; created_at: string }[];

  return (
    <>
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="كل مستخدم بيتضاف من Supabase، وبعدين بتحدد صلاحيته من هنا."
      />

      <div className="mb-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">عشان تضيف عضو جديد:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Supabase ← Authentication ← Users ← Invite user، واكتب الإيميل. الشخص هيوصله رابط يحدد منه كلمة المرور بنفسه.</li>
          <li>الحساب بيتسجل تلقائياً كـ "موظف". ارجع للصفحة دي وغيّر صلاحيته لو محتاج.</li>
          <li>لو الشخص اتدعى قبل كده ومش قادر يدخل: من Users اختار الشخص واطلب Send password recovery.</li>
        </ol>
      </div>

      {searchParams.saved ? <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">تم حفظ الصلاحية.</div> : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{ERRORS[searchParams.error] ?? 'حصلت مشكلة.'}</div>
      ) : null}

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الصلاحية</th>
                <th>تاريخ الإضافة</th>
                <th>تغيير الصلاحية</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">
                    {u.full_name}
                    {u.id === profile.id ? <span className="ms-2 text-xs text-slate-400">(إنت)</span> : null}
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td className="num">{formatDate(u.created_at)}</td>
                  <td>
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="py-1.5" disabled={u.id === profile.id}>
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-ghost py-1.5" disabled={u.id === profile.id}>
                        حفظ
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
