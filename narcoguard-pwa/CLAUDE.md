@AGENTS.md

## Claude Code tooling in this repo

- `.claude/hooks/session-start.sh` (cloud sessions): switches to Node 24, installs dependencies from the lockfile, and sets `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when Playwright's bundled Chromium is missing, so `npm run verify` works immediately.
- `.claude/settings.json`: pre-approves the read-only and gate commands, blocks reading real `.env*` files (use `.env.example` for names), and blocks force-pushes.
- `/validate` (`.claude/commands/validate.md`): comprehensive validation and repair of confirmed regressions.
- `release` skill (`.claude/skills/release/SKILL.md`): branch, gate, preview, PR, merge, production deploy and live verification, with the required human approval before production.
- `.mcp.json`: `next-devtools` (Next.js 16 docs and diagnostics) and `playwright` (browser checks), both pinned. Vercel and GitHub access come from the session's connectors; locally, add your own with `claude mcp add`.
