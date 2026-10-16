-- Practical offers a Hero publishes (rides, food, clothing, other). Account
-- owned and owner readable only: discovery is served by a separate, explicitly
-- consented path, so this table gets no anon or public policy. Offers are
-- independent of overdose certification.

create table if not exists public.hero_practical_offers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('transportation', 'food', 'clothing', 'other')),
  title text not null check (length(title) between 1 and 80),
  description text not null default '' check (length(description) <= 400),
  contact_method text check (contact_method in ('call', 'text')),
  contact_value text check (contact_value ~ '^\+[1-9][0-9]{7,14}$'),
  -- A published contact is either fully present or absent; never half set.
  constraint hero_practical_offers_contact_pair check (
    (contact_method is null and contact_value is null)
    or (contact_method is not null and contact_value is not null)
  ),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_practical_offers enable row level security;

drop policy if exists hero_practical_offers_owner_select on public.hero_practical_offers;
create policy hero_practical_offers_owner_select on public.hero_practical_offers for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists hero_practical_offers_owner_insert on public.hero_practical_offers;
create policy hero_practical_offers_owner_insert on public.hero_practical_offers for insert to authenticated with check (auth_user_id = (select auth.uid()));

drop policy if exists hero_practical_offers_owner_update on public.hero_practical_offers;
create policy hero_practical_offers_owner_update on public.hero_practical_offers for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));

drop policy if exists hero_practical_offers_owner_delete on public.hero_practical_offers;
create policy hero_practical_offers_owner_delete on public.hero_practical_offers for delete to authenticated using (auth_user_id = (select auth.uid()));

create index if not exists hero_practical_offers_owner_idx on public.hero_practical_offers (auth_user_id);
create index if not exists hero_practical_offers_active_idx on public.hero_practical_offers (category) where active;
