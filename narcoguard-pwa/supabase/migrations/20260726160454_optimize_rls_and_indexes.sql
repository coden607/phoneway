-- Supporting indexes for RLS ownership subqueries and response joins.
-- These are additive and safe to apply repeatedly.
create index if not exists emergency_responses_emergency_idx on public.emergency_responses(emergency_id);
create index if not exists emergency_responses_hero_idx on public.emergency_responses(hero_id);
create index if not exists emergency_contacts_user_idx on public.emergency_contacts(user_id);
create index if not exists legal_agreements_user_idx on public.legal_agreements(user_id);
