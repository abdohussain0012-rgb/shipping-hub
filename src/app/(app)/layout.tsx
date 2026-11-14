import { redirect } from 'next/navigation';
import { getCurrentProfile, canImport, isAdmin, type Role } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NavLinks, type NavItem } from '@/components/nav';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'أدمن',
  manager: 'مدير',
  agent: 'موظف',
};

function navItemsFor(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'الملخص اليومي' },
    { href: '/shipments', label: 'متابعة الشحنات' },
    { href: '/reports', label: 'التقارير' },
  ];
  if (canImport(role)) items.push({ href: '/import', label: 'استيراد ملفات الشركات' });
  if (isAdmin(role)) {
    items.push({ href: '/settings/status-map', label: 'توحيد الحالات' });
    items.push({ href: '/settings/users', label: 'المستخدمون والصلاحيات' });
  }
  return items;
}

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentProfile();
  const items = navItemsFor(profile.role);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-900 p-5 text-white md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 font-bold">SH</div>
          <div>
            <div className="font-bold leading-tight">Shipping Hub</div>
            <div className="text-xs text-brand-100">متابعة الشحن</div>
          </div>
        </div>

        <NavLinks items={items} />

        <div className="mt-auto rounded-xl bg-white/10 p-4">
          <div className="text-sm font-semibold">{profile.full_name}</div>
          <div className="mb-3 text-xs text-brand-100">{ROLE_LABELS[profile.role]}</div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-brand-100 underline-offset-4 hover:underline">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="font-bold">Shipping Hub</span>
          <form action={signOut}>
            <button type="submit" className="text-xs text-slate-500">
              خروج
            </button>
          </form>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {items.map((item) => (
              <a key={item.href} href={item.href} className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                {item.label}
              </a>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
