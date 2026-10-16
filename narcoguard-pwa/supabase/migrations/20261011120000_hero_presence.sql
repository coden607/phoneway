-- Short-lived, consented Hero presence for nearby discovery.
--
-- Owner readable only: this table is never the public discovery surface. A
-- separate, explicitly consented matching path returns coarse positions, so
-- there is no anon or public policy here either.
--
-- Three invariants are enforced by the schema rather than left to callers:
--  * coarseness - latitude/longitude are numeric(_,2), so a full-precision
--    coordinate cannot physically be stored even if a caller forgets to round;
--  * consent pairing - coordinates and a consent receipt exist only while
--    share_nearby is true, so withdrawing consent cannot leave a location behind;
--  * one row per account - presence is replaced, never accumulated into a trail.

create table if not exists public.hero_presence (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  share_nearby boolean not null default false,
  latitude numeric(4, 2) check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude numeric(5, 2) check (longitude is null or (longitude >= -180 and longitude <= 180)),
  consented_at timestamptz,
  expires_at timestamptz,
  -- Consent, location and expiry stand or fall together.
  constraint hero_presence_consent_pair check (
    (share_nearby = false and latitude is null and longitude is null and consented_at is null and expires_at is null)
    or (share_nearby = true and latitude is not null and longitude is not null and consented_at is not null and expires_at is not null)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_presence enable row level security;

drop policy if exists hero_presence_owner_select on public.hero_presence;
create policy hero_presence_owner_select on public.hero_presence for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists hero_presence_owner_insert on public.hero_presence;
create policy hero_presence_owner_insert on public.hero_presence for insert to authenticated with check (auth_user_id = (select auth.uid()));

drop policy if exists hero_presence_owner_update on public.hero_presence;
create policy hero_presence_owner_update on public.hero_presence for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));

drop policy if exists hero_presence_owner_delete on public.hero_presence;
create policy hero_presence_owner_delete on public.hero_presence for delete to authenticated using (auth_user_id = (select auth.uid()));

create index if not exists hero_presence_owner_idx on public.hero_presence (auth_user_id);
-- Discovery only ever scans live, consented rows.
create index if not exists hero_presence_live_idx on public.hero_presence (expires_at) where share_nearby;
