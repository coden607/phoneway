-- Accounts and sync, watch owner lock and Hero Network certification.
-- Additive and safe to apply repeatedly. Test on a non-production project first.

-- End-to-end encrypted settings backup. The server stores only ciphertext sealed in the browser
-- with a passphrase it never sees; one row per account.
create table if not exists public.user_vaults (
  auth_user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  sealed jsonb not null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint user_vaults_size check (pg_column_size(sealed) < 131072)
);

alter table public.user_vaults enable row level security;

drop policy if exists user_vaults_owner_select on public.user_vaults;
create policy user_vaults_owner_select on public.user_vaults for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists user_vaults_owner_insert on public.user_vaults;
create policy user_vaults_owner_insert on public.user_vaults for insert to authenticated with check (auth_user_id = (select auth.uid()));
drop policy if exists user_vaults_owner_update on public.user_vaults;
create policy user_vaults_owner_update on public.user_vaults for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
drop policy if exists user_vaults_owner_delete on public.user_vaults;
create policy user_vaults_owner_delete on public.user_vaults for delete to authenticated using (auth_user_id = (select auth.uid()));

-- Watch owner bindings. Rows are written only by the server (service role) after the registry
-- signs a binding; owners can read their own. owner_tag is a salted hash, not the account id.
create table if not exists public.watch_registrations (
  serial text primary key check (serial ~ '^NG-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}$'),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  owner_tag text not null,
  generation integer not null check (generation > 0),
  binding_token text not null,
  registered_at timestamptz not null default now()
);

create index if not exists watch_registrations_owner_idx on public.watch_registrations(auth_user_id);
alter table public.watch_registrations enable row level security;

drop policy if exists watch_registrations_owner_select on public.watch_registrations;
create policy watch_registrations_owner_select on public.watch_registrations for select to authenticated using (auth_user_id = (select auth.uid()));

-- Support-approved releases (warranty, theft recovery, estate, program return). Server only; no
-- client policies. A sale or trade is never an allowed reason.
create table if not exists public.watch_transfer_releases (
  id bigint generated always as identity primary key,
  serial text not null references public.watch_registrations(serial) on delete cascade,
  generation integer not null,
  reason text not null check (reason in ('warranty-replacement', 'recovered-after-theft', 'owner-deceased-estate', 'returned-to-program')),
  release_token text not null,
  released_at timestamptz not null default now()
);

alter table public.watch_transfer_releases enable row level security;

-- Hero Network certification: a 100% score on the server-graded test. Server writes; holders read.
create table if not exists public.hero_certifications (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  test_version integer not null,
  passed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  enrolled boolean not null default false
);

alter table public.hero_certifications enable row level security;

drop policy if exists hero_certifications_owner_select on public.hero_certifications;
create policy hero_certifications_owner_select on public.hero_certifications for select to authenticated using (auth_user_id = (select auth.uid()));
