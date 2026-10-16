# Environment and secret placement

`.env.example` is the canonical variable inventory. The three environment-specific
example files contain safe defaults and the subset normally needed in each runtime.
They are templates only; populated environment files and credentials must never be
committed.

## Local and Codex development

Copy `.env.development.example` to `.env.local` and add only the credentials needed
for the integration under test. Codex and other local automation inherit variables
from the local process or `.env.local`; do not put credentials in prompts, logs,
commits, or Codex configuration files.

The optional context-handoff helper uses `OPENROUTER_API_KEY` or `CLINE_API_KEY`.
Keep those values in the local secret store/process environment. `HANDOFF_PROVIDER`
and `HANDOFF_MODEL` are non-secret selectors.

## Vercel

Configure application variables in **Project Settings → Environment Variables** and
scope every value separately to Development, Preview, or Production. Use test or
preview resources outside Production. Variables beginning with `NEXT_PUBLIC_` are
embedded in browser bundles and must never contain credentials.

The Vercel/Supabase integration may provide `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or
`SUPABASE_DB_URL` instead of `DATABASE_URL`. The application accepts these aliases;
do not duplicate a database password unless required. Safety-critical feature flags
should stay disabled until their provider configuration and end-to-end behavior are
approved and verified.

## GitHub Actions

Repository/environment secrets used by the production deployment workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Store these in the protected GitHub `production` environment. Keep required reviewers
enabled so a successful CI run cannot bypass deployment approval. Application runtime
secrets belong in Vercel, not GitHub; `vercel pull` supplies the correctly scoped
values during the build.

The marketing workflow optionally reads `MARKETING_RELAY_URL` from GitHub Secrets and
`MARKETING_FORCE_DAY` from GitHub Variables. Scheduled runs generate artifacts only.
Publishing additionally requires a manually dispatched workflow with its `publish`
input enabled.

## Validation

Run `npm run validate:env` after adding or renaming a variable. It checks that source
references and environment variants remain represented in `.env.example`, and rejects
secret-looking `NEXT_PUBLIC_` names. It validates names and placement only and never
reads or prints secret values.
