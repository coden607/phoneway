const fs = require("node:fs")
const path = require("node:path")

const migrationDir = path.join(process.cwd(), "supabase", "migrations")
const migrations = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationDir, file), "utf8"))
  .join("\n")

const requiredTables = [
  "users",
  "vitals_readings",
  "emergencies",
  "heroes",
  "emergency_responses",
  "locations",
  "watches",
  "donations",
  "activity_log",
  "legal_agreements",
  "emergency_contacts",
]

const requiredChecks = [
  ["auth identity mapping", /auth_user_id\s+uuid\s+references\s+auth\.users/i],
  ["ownership helper", /create or replace function\s+public\.current_app_user_id/i],
  ["users RLS", /alter table public\.users enable row level security/i],
  ["vitals RLS", /alter table public\.vitals_readings enable row level security/i],
  ["emergency RLS", /alter table public\.emergencies enable row level security/i],
  ["response emergency index", /create index if not exists emergency_responses_emergency_idx/i],
  ["response hero index", /create index if not exists emergency_responses_hero_idx/i],
  ["contact ownership index", /create index if not exists emergency_contacts_user_idx/i],
  ["agreement ownership index", /create index if not exists legal_agreements_user_idx/i],
  ["service-only donations", /Donations and activity logs contain administrative/i],
  // Hero practical offers: account owned, owner readable only. A public or anon
  // read policy here would publish contact numbers, so its absence is enforced.
  ["hero offers table", /create table if not exists public\.hero_practical_offers/i],
  ["hero offers RLS", /alter table public\.hero_practical_offers enable row level security/i],
  ["hero offers owner select policy", /create policy hero_practical_offers_owner_select/i],
  ["hero offers owner insert policy", /create policy hero_practical_offers_owner_insert/i],
  ["hero offers owner update policy", /create policy hero_practical_offers_owner_update/i],
  ["hero offers owner delete policy", /create policy hero_practical_offers_owner_delete/i],
  ["hero offers owner index", /create index if not exists hero_practical_offers_owner_idx/i],
  ["hero offers contact pair guard", /hero_practical_offers_contact_pair/i],
  // Hero presence: short-lived, consented location for nearby discovery. A
  // public or anon read policy here would expose where people are, so its
  // absence is enforced, and so is the coarseness of what can be stored.
  ["hero presence table", /create table if not exists public\.hero_presence/i],
  ["hero presence RLS", /alter table public\.hero_presence enable row level security/i],
  ["hero presence owner select policy", /create policy hero_presence_owner_select/i],
  ["hero presence owner insert policy", /create policy hero_presence_owner_insert/i],
  ["hero presence owner update policy", /create policy hero_presence_owner_update/i],
  ["hero presence owner delete policy", /create policy hero_presence_owner_delete/i],
  ["hero presence owner index", /create index if not exists hero_presence_owner_idx/i],
  ["hero presence consent pair guard", /hero_presence_consent_pair/i],
  // numeric(_,2) makes a full-precision coordinate unstorable at the column
  // level, so a caller that forgets to round cannot pinpoint anyone.
  ["hero presence coarse latitude", /latitude numeric\(4,\s*2\)/i],
  ["hero presence coarse longitude", /longitude numeric\(5,\s*2\)/i],
  // One row per account: presence is replaced, never accumulated into a trail.
  ["hero presence single row per account", /auth_user_id uuid not null unique references auth\.users/i],
]

const failures = []
for (const table of requiredTables) {
  if (!new RegExp(`create table if not exists ${table}\\b`, "i").test(migrations)) {
    failures.push(`missing table definition: ${table}`)
  }
}
for (const [name, pattern] of requiredChecks) {
  if (!pattern.test(migrations)) failures.push(`missing ${name}`)
}

const policyCount = (migrations.match(/create policy\b/gi) || []).length
if (policyCount < 26) failures.push(`expected at least 26 explicit RLS policies, found ${policyCount}`)

if (failures.length) {
  console.error("[supabase] migration validation failed")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[supabase] migration validation passed (${requiredTables.length} tables, ${policyCount} policies)`)
