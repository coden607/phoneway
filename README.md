# PhoneWeigh

**A tilt-based digital precision scale that runs in your phone's browser — and tells you the truth about its own accuracy.**

PhoneWeigh measures weight by the deflection of the phone's gravity axis when a load presses on it. **Display resolution: 0.1g.** Measured accuracy: **whatever your Verification Ledger says** — typically ±0.1g to ±0.3g on a good compliant surface, verified via multi-point calibration. Every measurement reflects physical deflection rather than marketing.

## What it is

- Installable, offline-capable PWA (vanilla ES modules, **zero dependencies, no build step**).
- Calibrate with a known weight → the app fits a deflection curve for your specific phone + surface.
- Verify with reference weights → each result is recorded in the on-device **Verification Ledger** (`localStorage: phoneway_v5_ledger`).
- Every ±Xg claim in the app = worst measured |error| of your last 5 verifies, rounded up to the next 0.1g. No heuristics, no marketing.

## The foundation layer

Bare bones anything can be built over:

| Piece | What it does |
|---|---|
| `config/continuity.toml` | App identity, channel orchestration (calibrate / verify / diagnose / extend), honesty policy flags |
| `skills/` | Four agent-facing contracts: `calibrate`, `verify`, `diagnose`, `extend-channel` |
| `js/verificationLedger.js` | The honesty engine — the only source of accuracy claims |
| `scripts/check-static.mjs` | CI integrity gate: references exist, import graph resolves, version coherent |

New measurement paths (vibration resonance, camera deflection, audio) plug in per **`skills/extend-channel/SKILL.md`** — same ledger, same claim discipline.

## What changed in v5 (foundation rebase)

- Deleted ~6,700 lines of dead "quantum 15-sensor fusion / neural network" code that nothing imported (see `docs/legacy/DEAD-CODE-2026-10-08.md`).
- Fixed a fusion-units bug: orientation tilt (degrees) was averaged into the acceleration (m/s²) fusion, contaminating readings.
- All accuracy claims are now **evidence-based** — derived from the verification ledger, never from curve-fit shape or sensitivity heuristics. The old sensitivity-heuristic `±0.1g (excellent)` calibration label is gone.
- Verification pass/fail now uses the reference's real tolerance (was hardcoded `min(tolerance, 0.1g)`, which failed honest 5g verifies).
- Inline JS extracted from `index.html` into `js/` modules; CI runs real tests + static integrity checks.

## Develop

```bash
npm ci
npm test                          # vitest — calibration math + ledger
node scripts/check-static.mjs     # integrity gate (also runs in CI)
npm run serve                     # local static server
```

Deploys to Vercel via GitHub Actions (`.github/workflows/deploy.yml`) after tests + checks pass.

## Docs

- `ACCURACY_FEATURES.md` — measured-error bands and what affects them
- `docs/legacy/DEAD-CODE-2026-10-08.md` — what was removed in the rebase and why
- `CLAUDE.md` — orientation for AI assistants (accuracy policy included)
- `QUICKSTART.md` · `DEPLOYMENT.md` · `AGENTS.md`

## Honest limitations

- Tilt scales measure **deflection**, not mass directly — surface, case, temperature, and placement all matter.
- Maximum ~100–200g depending on the phone; minimum ~0.1g surface-dependent.
- The ledger starts empty on every device. Until you verify, accuracy is UNVERIFIED — that's a feature.
