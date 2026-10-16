# NarcoGuard — public PWA and wearable research concept

NarcoGuard explores overdose prevention and person-led recovery support. The public web app is a **demo and research concept**. It is not a validated medical device, emergency dispatch service, treatment program, or proof that an experimental wearable can detect or reverse an overdose. In an immediate emergency, call 911.

## Visit and contribute

- [Public PWA](https://narcoguard-pwa.vercel.app)
- [Guardian Stability planner](https://narcoguard-pwa.vercel.app/stability)
- [Founding Constitution](https://narcoguard-pwa.vercel.app/constitution) — **founding draft, not yet ratified**
- [Repository](https://github.com/coden607/narcoguard-pwa)
- Contact: [narcoguard607@gmail.com](mailto:narcoguard607@gmail.com)

## What this release does

The PWA demonstrates emergency guidance, wearable and community response concepts. A screen or prototype algorithm does not establish clinical reliability. The public demo does not automatically contact 911, dispatch responders, deliver naloxone, or alert loved ones.

The optional Guardian Stability page lets a person record daily needs, estimated sleep, personal goals, a task for tomorrow, and a support phone number. It suggests relevant public service directories such as 211 when a need is marked. Records stay in the browser's local storage; there is no account sync. A person can pause recording or erase planner data from that browser. A link to call a support person opens the phone dialer only when tapped. The page shows a descriptive count from answered entries after enough data is available, not a relapse prediction. Resources may be unavailable or have changed; verify with each provider.

Site traffic is measured with Vercel Analytics. Guardian check-in answers, sleep, goals, ZIP code and contact number are not sent as custom analytics events. See the [privacy page](https://narcoguard-pwa.vercel.app/privacy) for browser-sharing and third-party-link details.

## Planned Guardian work

The long-term direction is a person-led planner for food, water, rest, hygiene, laundry, safety, connection, treatment, and meaningful goals. The next resource phase needs verified local service hours, eligibility, accessibility, freshness, and an honest unknown or unavailable state. Only after separate evaluation could the product offer opt-in proactive guidance based on personal patterns. It must never invent a percentage chance of relapse or treat a correlation as a clinical prediction. Any outbound alert to a loved one requires separate, specific, revocable permission, delivery handling, and review. These capabilities are **not live**. Engineering rules are in [AGENTS.md](AGENTS.md).

## Founding Constitution

The [canonical draft](docs/governance/CONSTITUTION.md) is published at `/constitution`. Visitors can submit public support, objections, proposed changes, evidence, harms, or constitutional challenges through the [structured issue form](https://github.com/coden607/narcoguard-pwa/issues/new?template=constitution.yml). A public GitHub issue number identifies the submission; discussion, decisions, and linked PRs provide a review record. Do not place private health, contact, or location information in a public issue. Email is available for feedback that should not be public. Submissions are advisory: they neither edit the document automatically nor control emergency functions. Binding elections, ratification, and institution-level authority require future reviews and are not implemented here.

## Run locally

Use Node 24 and npm. Copy `.env.example` to `.env.local` only if you need the optional integrations; never commit secret values.

```bash
npm ci
npm run dev
```

Run `npm run verify` before a release. This checks lint, types, production and claim validation, signal/Guardian/Constitution tests, dependency audit, build, and PWA browser smoke. Browser tests require Playwright Chromium; CI runs them when a local browser is unavailable. See [deployment guidance](docs/DEPLOYMENT.md) and [project operations](docs/PROJECT_OPERATING_SYSTEM.md).

## License

MIT. Contributions do not confer ownership, employment, payment, or governance authority.
