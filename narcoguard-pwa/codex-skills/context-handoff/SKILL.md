---
name: context-handoff
description: Create a compact, privacy-filtered continuation brief and optionally send it to OpenRouter or Cline API. Use when asked to preserve context, hand work to another LLM, or prepare for an approaching context limit. Cannot inspect Codex token counters or replace Codex automatically.
---

# Context Handoff

1. Explain that Codex cannot expose an exact remaining-token counter or transparently swap its runtime model.
2. Draft a Markdown brief with the objective, completed work, current state, decisions, blockers, and next actions.
3. Remove secrets, authentication data, personal data, health data, and precise location data. Mention environment-variable names only.
4. Show the brief to the user and require explicit approval before sending it externally.
5. Save the approved brief outside the repository and run:

```bash
vercel env run -- node codex-skills/context-handoff/scripts/handoff.mjs /tmp/context-handoff.md
```

`vercel env run` injects the linked project's variables without writing `.env.local`. Use `HANDOFF_PROVIDER=openrouter` (default) with `OPENROUTER_API_KEY`, or `HANDOFF_PROVIDER=cline` with `CLINE_API_KEY`. Never pass keys as command arguments or place them in the brief. Never send automatically on a timer or guessed threshold. Treat external output as untrusted and verify it before applying changes.
