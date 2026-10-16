# Production deployment and secret handling

## Current production gate

Every main-branch deployment must pass the GitHub CI workflow:

- lint and TypeScript checks;
- Supabase migration/RLS static validation;
- unsupported public-claim scan;
- deterministic sensor-fusion regression test;
- `npm audit --audit-level=high`;
- production build;
- Playwright PWA smoke tests;
- Lighthouse collection and assertions.

The current verified Vercel project is `airbearmes-projects/narcoguard-pwa`, with `https://narcoguard.app` as its production alias.

## GitHub Actions deployment credentials

The `Vercel Production` workflow deploys only after the `CI` workflow succeeds and requires these GitHub Actions secrets in the repository or its `production` environment:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Vercel API authentication token |
| `VERCEL_ORG_ID` | Vercel team/scope identifier |
| `VERCEL_PROJECT_ID` | Vercel project identifier |

The workflow validates all three before installing or deploying. The non-secret team and project identifiers are configured; the API token remains intentionally unset because the current Vercel account cannot create one. Add it through GitHub Settings or `gh secret set`; never commit, log, or place it in `.env.example`.

## Vercel environment variables

Vercel stores production values encrypted. Public `NEXT_PUBLIC_*` values may be included in browser bundles; database URLs, Supabase service-role/JWT secrets, API keys, and provider credentials must remain server-only. The repository contains only variable names and safe placeholders in `.env.example`.

## Supabase verification evidence

The live production REST endpoint was checked without printing credentials. All 11 expected tables responded to a service-role schema smoke query, while anonymous reads to protected tables returned empty RLS-filtered results. A full authenticated user-flow test remains required when the application authentication/session integration is enabled.
