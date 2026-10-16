-- NarcoGuard authorization boundary for Supabase Postgres.
--
-- The application keeps its domain user record separate from auth.users. The
-- auth_user_id mapping is therefore the only trusted bridge used by policies.
-- Until a row is linked to auth.users, it is intentionally inaccessible to
-- authenticated client sessions. The service role remains available for
-- server-side ingestion and administrative jobs.

alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists users_auth_user_id_idx
  on public.users(auth_user_id)
  where auth_user_id is not null;

create or replace function public.current_app_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
  limit 1
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

alter table public.users enable row level security;
alter table public.vitals_readings enable row level security;
alter table public.emergencies enable row level security;
alter table public.heroes enable row level security;
alter table public.emergency_responses enable row level security;
alter table public.locations enable row level security;
alter table public.watches enable row level security;
alter table public.donations enable row level security;
alter table public.activity_log enable row level security;
alter table public.legal_agreements enable row level security;
alter table public.emergency_contacts enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (id = public.current_app_user_id());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id() and auth_user_id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated
  with check (auth_user_id = auth.uid() and role = 'user');

drop policy if exists vitals_select_own on public.vitals_readings;
create policy vitals_select_own on public.vitals_readings
  for select to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists vitals_insert_own on public.vitals_readings;
create policy vitals_insert_own on public.vitals_readings
  for insert to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists emergencies_select_own on public.emergencies;
create policy emergencies_select_own on public.emergencies
  for select to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists emergencies_insert_own on public.emergencies;
create policy emergencies_insert_own on public.emergencies
  for insert to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists emergencies_update_own on public.emergencies;
create policy emergencies_update_own on public.emergencies
  for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists heroes_select_own on public.heroes;
create policy heroes_select_own on public.heroes
  for select to authenticated
  using (user_id = public.current_app_user_id());

drop policy if exists heroes_insert_own on public.heroes;
create policy heroes_insert_own on public.heroes
  for insert to authenticated
  with check (user_id = public.current_app_user_id());

drop policy if exists heroes_update_own on public.heroes;
create policy heroes_update_own on public.heroes
  for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists responses_select_related on public.emergency_responses;
create policy responses_select_related on public.emergency_responses
  for select to authenticated
  using (
    hero_id in (select id from public.heroes where user_id = public.current_app_user_id())
    or emergency_id in (select id from public.emergencies where user_id = public.current_app_user_id())
  );

drop policy if exists responses_insert_as_hero on public.emergency_responses;
create policy responses_insert_as_hero on public.emergency_responses
  for insert to authenticated
  with check (hero_id in (select id from public.heroes where user_id = public.current_app_user_id()));

drop policy if exists responses_update_as_hero on public.emergency_responses;
create policy responses_update_as_hero on public.emergency_responses
  for update to authenticated
  using (hero_id in (select id from public.heroes where user_id = public.current_app_user_id()))
  with check (hero_id in (select id from public.heroes where user_id = public.current_app_user_id()));

drop policy if exists locations_own on public.locations;
create policy locations_own on public.locations
  for all to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists watches_own on public.watches;
create policy watches_own on public.watches
  for all to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists contacts_own on public.emergency_contacts;
create policy contacts_own on public.emergency_contacts
  for all to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

drop policy if exists agreements_own on public.legal_agreements;
create policy agreements_own on public.legal_agreements
  for select to authenticated
  using (user_id = public.current_app_user_id());

-- Donations and activity logs contain administrative or identifying data. They
-- intentionally have no client policies; only the service role can access them.
