-- Shipping Hub: database schema
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run for the functions and policies (they use "create or replace" / drop-if-exists).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Enums and core tables
-- ---------------------------------------------------------------
do $$ begin
  create type app_role as enum ('admin', 'manager', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_status as enum (
    'pending_pickup', 'in_transit', 'out_for_delivery',
    'delivered', 'failed', 'returned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'agent',
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- aramex | bosta | uni
  name text not null unique
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  branch_id uuid references public.branches(id) on delete set null
);

-- Maps the raw status text of each courier to one normalized status.
create table if not exists public.status_map (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  raw_status text not null,
  status shipment_status not null,
  unique (company_id, raw_status)
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  awb text not null,                    -- courier tracking / air waybill number
  reference text,                       -- shipper reference (order number)
  raw_status text,
  status shipment_status not null default 'pending_pickup',
  branch_id uuid references public.branches(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  order_value numeric(12, 2),
  shipping_cost numeric(12, 2),
  cod_amount numeric(12, 2),
  shipped_at timestamptz,               -- when the courier picked the parcel up
  delivered_at timestamptz,
  last_status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, awb)
);

create index if not exists shipments_status_idx on public.shipments (status);
create index if not exists shipments_shipped_idx on public.shipments (shipped_at);
create index if not exists shipments_branch_idx on public.shipments (branch_id);
create index if not exists shipments_agent_idx on public.shipments (agent_id);

-- Append-only audit trail: every status change and every note.
create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status shipment_status,
  raw_status text,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_idx on public.shipment_events (shipment_id, created_at desc);

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------
create or replace function public.my_role()
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- New sign-ups get a profile automatically with the "agent" role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'agent');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps updated_at and last_status_at correct on every write.
create or replace function public.shipments_before_write()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.last_status_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_before_write on public.shipments;
create trigger shipments_before_write
  before insert or update on public.shipments
  for each row execute function public.shipments_before_write();

-- Writes an audit event whenever a shipment is created or its status changes.
create or replace function public.shipments_after_status()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.shipment_events (shipment_id, status, raw_status, actor_id)
    values (new.id, new.status, new.raw_status, auth.uid());
  end if;
  return null;
end;
$$;

drop trigger if exists shipments_after_status on public.shipments;
create trigger shipments_after_status
  after insert or update of status on public.shipments
  for each row execute function public.shipments_after_status();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.agents enable row level security;
alter table public.status_map enable row level security;
alter table public.app_settings enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

-- profiles: team members see each other's names (needed for the audit trail);
-- only admins change roles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.my_role() is not null);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Reference data: everyone reads; admins write.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated using (public.my_role() is not null);
drop policy if exists companies_write on public.companies;
create policy companies_write on public.companies for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists status_map_select on public.status_map;
create policy status_map_select on public.status_map for select to authenticated using (public.my_role() is not null);
drop policy if exists status_map_write on public.status_map;
create policy status_map_write on public.status_map for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (public.my_role() is not null);
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Branches and agents: managers and admins create them (import does this); admins delete.
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches for select to authenticated using (public.my_role() is not null);
drop policy if exists branches_insert on public.branches;
create policy branches_insert on public.branches for insert to authenticated
  with check (public.my_role() in ('admin', 'manager'));
drop policy if exists branches_update on public.branches;
create policy branches_update on public.branches for update to authenticated
  using (public.my_role() in ('admin', 'manager')) with check (public.my_role() in ('admin', 'manager'));
drop policy if exists branches_delete on public.branches;
create policy branches_delete on public.branches for delete to authenticated
  using (public.my_role() = 'admin');

drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents for select to authenticated using (public.my_role() is not null);
drop policy if exists agents_insert on public.agents;
create policy agents_insert on public.agents for insert to authenticated
  with check (public.my_role() in ('admin', 'manager'));
drop policy if exists agents_update on public.agents;
create policy agents_update on public.agents for update to authenticated
  using (public.my_role() in ('admin', 'manager')) with check (public.my_role() in ('admin', 'manager'));
drop policy if exists agents_delete on public.agents;
create policy agents_delete on public.agents for delete to authenticated
  using (public.my_role() = 'admin');

-- Shipments: all staff read; agents, managers and admins create and update; only admins delete.
drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments for select to authenticated using (public.my_role() is not null);
drop policy if exists shipments_insert on public.shipments;
create policy shipments_insert on public.shipments for insert to authenticated
  with check (public.my_role() in ('admin', 'manager', 'agent'));
drop policy if exists shipments_update on public.shipments;
create policy shipments_update on public.shipments for update to authenticated
  using (public.my_role() in ('admin', 'manager', 'agent'))
  with check (public.my_role() in ('admin', 'manager', 'agent'));
drop policy if exists shipments_delete on public.shipments;
create policy shipments_delete on public.shipments for delete to authenticated
  using (public.my_role() = 'admin');

-- Audit trail: all staff read; events are only inserted under the actor's own id; never updated or deleted.
drop policy if exists events_select on public.shipment_events;
create policy events_select on public.shipment_events for select to authenticated using (public.my_role() is not null);
drop policy if exists events_insert on public.shipment_events;
create policy events_insert on public.shipment_events for insert to authenticated
  with check (actor_id = auth.uid() and public.my_role() in ('admin', 'manager', 'agent'));

-- ---------------------------------------------------------------
-- Reporting functions (security invoker: RLS applies to them too)
-- ---------------------------------------------------------------
create or replace function public.late_after_days()
returns int
language sql stable security invoker set search_path = public
as $$
  select coalesce((select value::int from public.app_settings where key = 'late_after_days'), 3);
$$;

create or replace function public.dashboard_kpis()
returns json
language sql stable security invoker set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from public.shipments),
    'open', (select count(*) from public.shipments
             where status not in ('delivered', 'returned', 'cancelled')),
    'late', (select count(*) from public.shipments
             where status not in ('delivered', 'returned', 'cancelled')
               and coalesce(shipped_at, created_at) < now() - make_interval(days => public.late_after_days())),
    'delivered_today', (select count(*) from public.shipments
             where status = 'delivered' and last_status_at >= date_trunc('day', now())),
    'delivery_rate', (select case
             when count(*) filter (where status in ('delivered', 'failed', 'returned')) = 0 then 0
             else round(100.0 * count(*) filter (where status = 'delivered')
                  / count(*) filter (where status in ('delivered', 'failed', 'returned')), 1)
           end from public.shipments)
  );
$$;

-- dim: 'company' | 'branch' | 'agent'
create or replace function public.report_summary(dim text, d_from timestamptz, d_to timestamptz)
returns table (
  group_name text,
  total bigint,
  delivered bigint,
  failed bigint,
  returned bigint,
  open_count bigint,
  late_count bigint,
  delivery_rate numeric,
  total_cost numeric
)
language sql stable security invoker set search_path = public
as $$
  with base as (
    select s.*,
      case dim
        when 'company' then (select c.name from public.companies c where c.id = s.company_id)
        when 'branch'  then coalesce((select b.name from public.branches b where b.id = s.branch_id), 'بدون فرع')
        when 'agent'   then coalesce((select a.name from public.agents a where a.id = s.agent_id), 'بدون مندوب')
      end as gname
    from public.shipments s
    where coalesce(s.shipped_at, s.created_at) between d_from and d_to
  )
  select
    gname,
    count(*),
    count(*) filter (where status = 'delivered'),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status = 'returned'),
    count(*) filter (where status not in ('delivered', 'returned', 'cancelled')),
    count(*) filter (where status not in ('delivered', 'returned', 'cancelled')
                       and coalesce(shipped_at, created_at) < now() - make_interval(days => public.late_after_days())),
    case when count(*) filter (where status in ('delivered', 'failed', 'returned')) = 0 then 0
         else round(100.0 * count(*) filter (where status = 'delivered')
              / count(*) filter (where status in ('delivered', 'failed', 'returned')), 1)
    end,
    coalesce(sum(shipping_cost), 0)
  from base
  group by gname
  order by count(*) desc;
$$;

-- ---------------------------------------------------------------
-- Defaults
-- ---------------------------------------------------------------
insert into public.companies (code, name) values
  ('aramex', 'Aramex'),
  ('bosta', 'Bosta'),
  ('uni', 'Uni')
on conflict do nothing;

insert into public.app_settings (key, value) values ('late_after_days', '3')
on conflict (key) do nothing;

-- Accounts that already exist before this script runs get a profile too.
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data->>'full_name', email), 'agent'
from auth.users
on conflict (id) do nothing;
