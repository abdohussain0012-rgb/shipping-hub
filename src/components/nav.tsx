'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-sm text-brand-100 transition hover:bg-white/10 hover:text-white'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
