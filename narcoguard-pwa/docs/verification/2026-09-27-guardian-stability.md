# Guardian Stability review snapshot — September 27, 2026

This snapshot describes the proposed branch before merge or production deployment. Local HTTP timings are smoke baselines, not field performance benchmarks.

## Checks

- `npm ci`: succeeded with locked dependencies.
- `npm run lint`, `npm run typecheck`, `npm run validate:production`, `npm run validate:supabase`, `npm run validate:claims`, `npm run test:signals`, `npm run test:guardian` (6/6), `npm run validate:watch-design`, `npm audit --audit-level=high`, `npm run build`: passed. Audit reported zero vulnerabilities after Next.js 15.5.26 and Sharp 0.35.5 upgrades.
- `npm run test:pwa`: blocked because this workspace lacks a Chromium binary. Installation from Playwright's CDN failed behind the network proxy. The existing PWA and new consent/pause/erase browser tests must run on a runner with Chromium before production deployment. This check is **not passed**.
- `git diff --check`: passed.

## Local production HTTP smoke baseline

With `next start` and a local Node fetch, `/stability` returned 200 in 69 ms, `/constitution` returned 200 in 25 ms, `/manifest.webmanifest` returned 200 in 44 ms, and `/sw.js` returned 200 in 16 ms. These single samples omit hydration, mobile network latency, browser rendering and caching. The static build listed `/stability` at 4.85 kB route JS / 119 kB first-load JS, and `/constitution` at 162 B route JS / 106 kB first-load JS.

## Release boundary

The first release is opt-in, local-browser-only. No predictive relapse scores, verified live opening hours, automatic loved-one notifications, background geofences or clinical claims are present. Live 211 records require authorized API access. Automatic messaging requires consented identities and a secure delivery audit. The Constitution remains a founding draft and has no binding governance effect. Production release remains blocked until the browser gate and any required review pass.
