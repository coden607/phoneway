# NarcoGuard resource finder — proposed launch design

## Outcome
People can find practical help across all five Maslow categories on narcoguard.app without an account, planner enrollment, check-ins, or recovery disclosure. Categories organize services; they never restrict access or rank people.

## Coverage
1. Basic needs: food, water, shelter/rest, clothing, hygiene, laundry.
2. Safety: housing support, health/treatment directories, domestic violence support, benefits, transport, legal assistance.
3. Belonging: peer support, community groups, social connection.
4. Esteem: employment help, skills, education, volunteering.
5. Growth: learning, creative activities, personal goals.

Launch geography requires the user's answer. Recommend a checked local catalog plus nationwide official directory fallbacks. Nationwide provider-level coverage requires an authorized data source; broad directory links must be labeled as directory searches.

## Implementation
- Public /resources page linked from the dashboard and Stability page, available when the planner is disabled, paused, or erased.
- Search and category/service filters; optional user-entered ZIP. Do not require location access. Keep search inputs in component memory; no personal search analytics or URL parameters.
- Versioned, typed provider catalog with service category, geographic coverage, contact/site, address where public, eligibility, hours, accessibility, provenance, source-check date, and explicit unknown fields.
- Clearly distinguish source-checked listings from provider-confirmed availability. No open-now, available-bed, or eligibility guarantee. Show source dates and stale states; missing fields remain unknown.
- Contact and directions actions occur only after an explicit tap. Explain that external destinations receive information the person chooses to send. Do not request directions using current location automatically.
- Official directory and tap-to-call 211 fallback for empty results, unsupported ZIPs, missing data, and offline conditions. Existing emergency paths remain independent.
- Lightweight local catalog works offline once the resources page has been cached. External calls/maps/search require the corresponding device capability or network. Verify actual service-worker behavior before promising offline coverage.
- Document catalog review and update procedures. Do not claim an automated refresh or monitoring service exists without implementing and checking it.

## Data-source options
Recommended: maintain a small local catalog from official provider pages, with national directory coverage. This ships without an API dependency but requires scheduled human review.
Alternative: authorized 211 integration, with validated schema, server-only credentials, timeout/caching controls, and availability fallback. Requires approved access and contractual coverage.
Directory-only: quickest, but insufficient for useful provider cards inside the app.

## Verification and release
Test all category mappings, search/filter combinations, invalid ZIPs, unknown/stale data, safe external actions, declined/paused/erased planner access, accessibility, mobile use, offline behavior, and emergency-path independence. Run the complete npm run verify gate. Produce a reviewed preview and identify its exact commit before requesting the repository-required immediate production confirmation. Verify the public custom domain after release.

## Current environment
The newer clean checkout is /root/projects/narcoguard-pwa; the older checkout is its ancestor. Both are outside this session's writable roots. Implementation must use an isolated working copy under /root/main-repo without copying environment secrets, dependencies, or build outputs. Connected GitHub and Vercel tools are available; VPS shell GitHub authentication/network access is failing. Dependency installation and browser verification feasibility still need checking in the permitted working copy.

## Decisions needed
- Launch geography and desired coverage depth.
- Approval of this design before product implementation, as required by the brainstorming skill.
