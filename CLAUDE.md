# Project init — /root/main-repo (always-on contract)

Inherits [/root/CLAUDE.md](file:///root/CLAUDE.md) and [/root/.claude/CLAUDE.md](file:///root/.claude/CLAUDE.md). Nothing here is optional.

## Every task, no reminder needed
1. **route-through-continuityos** — all work, routing, memory and safety invariants flow through Continuity OS: [/root/Projects/continuity-os](file:///root/Projects/continuity-os), daemon [http://localhost:3030](http://localhost:3030). Zero-token local capabilities before any model call.
2. **Canonical skills** — [/root/.coden607/skills](file:///root/.coden607/skills) (github.com/coden607/skills). Read [bundle.md](file:///root/.coden607/skills/bundle.md), load only the 1–3 matching `SKILL.md` files.
3. **compress-token-spend** — cheapest capable tier; search/grep before reading files; shortest complete reply; stable prompt prefix for cache hits; report deltas, not narration.
4. **route-with-jev / jev-gate** — every routing, gating, classification or guardrail decision goes to Jev (`POST http://localhost:3030/api/jev`, or [decide.py](file:///root/.coden607/skills/jev-gate/scripts/decide.py)), confidence floor **0.72**. Never burn a full LLM call on these.
5. **anticipate** — end every substantive turn with **Result → Blocker → Next action** (`do_now` / `suggest` / `ask_first`).
6. **route-interrupts** — mid-task message ≠ stop: classify as steering / side question / new task / urgent. Never drop the active task. "Stop" stops now.
7. **maintain-second-brain** — durable fact → STATE in [second-brain/MEMORY.md](file:///root/Projects/continuity-os/second-brain/MEMORY.md), EVENT in `second-brain/daily/YYYY-MM-DD.md`.
8. **isolate-agent-runs** — gate destructive, irreversible, monetary, outbound or production actions. Ask first.
9. **always-format-clickable-links** — every URL and file path as a Markdown link.

First reply line of every turn: `Skills: <names applied>`.

## Enforcement
Hook (not prompt memory): [always-on.sh](file:///root/.coden607/hooks/always-on.sh) fires on `SessionStart` and `UserPromptSubmit` via [/root/.claude/settings.json](file:///root/.claude/settings.json).

## Repo / account rules
GitHub account `coden607` only; new repos private by default. Planning: `plan-create-prd` → `plan-architecture` → `plan-create-stories`; ship via `run-software-factory` (never raise autonomy unasked).

## What is actually in this directory
`/root/main-repo` is a container, **not** a git repo (`git rev-parse` fails here). It holds exactly one codebase plus one design note:

- **[narcoguard-pwa/](file:///root/main-repo/narcoguard-pwa)** — the real project. Next.js **16.3.8** / React **19.3.0** / TypeScript PWA, `narcoguard-pwa@2.0.0`. It carries its own [CLAUDE.md](file:///root/main-repo/narcoguard-pwa/CLAUDE.md) which is just `@AGENTS.md` plus a tooling list — **read that file and its `AGENTS.md` before touching code there**; do not duplicate its rules here.
- **[narcoguard-resource-finder-design.md](file:///root/main-repo/narcoguard-resource-finder-design.md)** — design note for the resource-finder feature (`lib/resource-finder.ts`, `lib/resource-lookup.ts`).

### Commands (run from `narcoguard-pwa/`, not from `/root/main-repo`)
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` (wraps `scripts/run-next-build.js`, not bare `next build`) |
| Lint | `npm run lint` |
| Types | `npm run typecheck` (`next typegen && tsc --noEmit` — typegen first, or it fails) |
| **Full gate** | `npm run verify` (= `npm run health`) |
| One test file | `node --import tsx --test tests/<file>.test.ts` |
| E2E | `npm run test:e2e` (builds first, then Playwright) |

`npm run verify` is a **14-step chain**: lint → validate:production → validate:env → typecheck → validate:supabase → validate:claims → test:signals → test:vitals → test:guardian → test:constitution → test:features → validate:watch-design → audit:deps → build → test:pwa. It is the project's real definition of green, so prefer it over cherry-picked steps before claiming done. Tests are **`node --test` + tsx**, not Jest/Vitest — don't reach for a runner this repo doesn't use.

Architecture worth knowing before editing: business logic lives in flat modules under [lib/](file:///root/main-repo/narcoguard-pwa/lib) (`prevention-engine.ts`, `guardian-*.ts`, `kalman-filter.ts`, `ble-vitals.ts`, `twilio.ts`, `supabase-auth.ts`), **not** inside components — the `app/` routes and Radix-based `components/` are thin over it. Several `lib` modules are split `-shared.ts` / `.ts` to keep client and server halves apart; respect that split or you'll pull server code into the bundle. The `scripts/validate-*.js` family encodes deployment invariants (env, Supabase, production claims) and is the reason `verify` is long.

## Terminal / tmux (iSH on iPhone) — settled, do not re-litigate
This is the single most-regressed thing on this box. The full fact is STATE in [/root/.claude/CLAUDE.md](file:///root/.claude/CLAUDE.md) ("iSH scroll") and [second-brain/MEMORY.md](file:///root/Projects/continuity-os/second-brain/MEMORY.md). Short form:

- Finger scroll works via **iSH's own native buffer**, not tmux. The levers are `setw -g alternate-screen off`, `set -g status off`, and **restarting the pane** (a live TUI already owns the alt screen; no tmux command can evict it).
- **`history-limit` is not a scroll lever.** A claude pane's tmux scrollback measured 96 lines against `history-limit 500000`. Raising it buys nothing. Standing value **500000**; cap is INT_MAX `2147483647`; this box has ~2 GB RAM, so a huge limit risks OOM-killing the services.
- **`alternate-screen` is a WINDOW option** — `set -g` silently no-ops; use `setw`, and fix already-open windows explicitly.
- **Never append to `~/.tmux.conf`.** Repeated appends are the actual regression engine (4× `history-limit`, 15× `terminal-overrides`); tmux is **last-wins**, so a stale tail silently beats the intended value. Verify with `grep -n <option> ~/.tmux.conf` (read the **last** hit) then `tmux show-options -g <option>`. Use `set -g` to replace.
- Deep history is not a tmux problem: [s-web](file:///root/bin/s-web) → [cos.134-122-113-44.sslip.io/scroll](https://cos.134-122-113-44.sslip.io/scroll), `prefix + s` walk mode, `prefix + P` playback.
