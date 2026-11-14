-- Migration 002: only team members can read data.
-- Run once in Supabase -> SQL Editor on an existing project.
-- New projects already get this from schema.sql. Safe to run more than once.
-- Changes access rules only. No data is changed or deleted.
--
-- Why: the old read rules let ANY signed-in account read shipments, even without a profile.
-- A user without a profile is not on the team, so after this change they see nothing.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.my_role() is not null);

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (public.my_role() is not null);

drop policy if exists status_map_select on public.status_map;
create policy status_map_select on public.status_map for select to authenticated
  using (public.my_role() is not null);

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated
  using (public.my_role() is not null);

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches for select to authenticated
  using (public.my_role() is not null);

drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents for select to authenticated
  using (public.my_role() is not null);

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments for select to authenticated
  using (public.my_role() is not null);

drop policy if exists events_select on public.shipment_events;
create policy events_select on public.shipment_events for select to authenticated
  using (public.my_role() is not null);
