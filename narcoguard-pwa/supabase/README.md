# Supabase database operations

Migrations are applied in filename order with the Supabase CLI or the hosted
SQL editor. `002-enable-rls.sql` links the application `users` record to
`auth.users` through `users.auth_user_id` and enables deny-by-default RLS.

Important operational rules:

- Link a user row to the authenticated Supabase user before granting client access.
- Use the service-role key only in server-side jobs; it bypasses RLS and must never be exposed to a browser.
- Test migrations against a non-production project before applying them to production.
- Keep vitals, locations, emergency details, and contact information private to the owning user unless a reviewed responder policy explicitly grants access.
- Donations and activity logs intentionally have no client policies; administrative/server jobs own those tables.
