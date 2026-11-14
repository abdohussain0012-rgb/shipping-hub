import { NextResponse, type NextRequest } from 'next/server';
import { csvCell } from '@/lib/csv';
import { createClient } from '@/lib/supabase/server';
import { daysAgoCairo, rangeToIso, todayCairo } from '@/lib/format';

const DIMS = ['company', 'branch', 'agent'] as const;

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

// CSV export of the summary report. Uses the caller's session, so RLS still applies.
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const sp = request.nextUrl.searchParams;
  const dim = (DIMS as readonly string[]).includes(sp.get('dim') ?? '') ? sp.get('dim')! : 'company';
  const from = validDate(sp.get('from')) ?? daysAgoCairo(30);
  const to = validDate(sp.get('to')) ?? todayCairo();
  const range = rangeToIso(from, to);

  const { data, error } = await supabase.rpc('report_summary', {
    dim,
    d_from: range.from,
    d_to: range.to,
  });
  if (error) return new NextResponse('Report failed', { status: 500 });

  const header = [
    'name',
    'total',
    'delivered',
    'failed',
    'returned',
    'open',
    'late',
    'delivery_rate_percent',
    'total_cost_egp',
  ];
  const lines = [header.join(',')];
  for (const r of (data ?? []) as any[]) {
    lines.push(
      [
        r.group_name,
        r.total,
        r.delivered,
        r.failed,
        r.returned,
        r.open_count,
        r.late_count,
        r.delivery_rate,
        r.total_cost,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${dim}-${from}-to-${to}.csv"`,
    },
  });
}
