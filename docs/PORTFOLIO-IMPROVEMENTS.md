# Portfolio engineering improvement backlog

Recorded: 2026-11-02. Source: 2026-11-02 portfolio review based on GitHub READMEs and repository metadata. Scores and recommendations were subjective preliminary assessments, **not** validated code audits or verified current CI results.

Tracking: ContinuityOS is coordination only; execution belongs in this repository under its own AGENTS.md and approvals. Do not confuse a planned enhancement with an implemented capability. No automatic merges, production deployment, customer messaging or destructive actions.

## P1 — Measurement credibility
- [ ] Validate deflection-calibration with controlled reference masses across surfaces and actual phones.
- [ ] Report measurement bias, MAE, RMSE, worst error and uncertainty without confusing 0.1g display resolution with verified accuracy.
- [ ] Test verification ledger persistence, failure states, browser sensor restrictions, accessibility and zero-dependency offline PWA.
- [ ] Publish repeatable experiment and representative results, labeled unverified until measured.

## Cross-repository quality standard
- [ ] Verify repo origin/default branch/AGENTS.md and exact commit; keep worktree, credentials and PR strictly scoped.
- [ ] Choose one narrow end-to-end use case and explicit acceptance criteria; test before adding feature breadth.
- [ ] Document verified vs experimental vs planned capabilities; no unsupported production claims.
- [ ] Require exact-head CI evidence, test coverage, security and accessibility checks where applicable.
- [ ] Show a runnable demo, 60–120s walkthrough, architecture diagram, setup, limitations and personal engineering contribution.
- [ ] Seek approval before merge, deployment, destructive cleanup, external sending or paying.

## Definition of done
- [ ] Reproduce baseline issue or evidence gap, capture current commit and existing behavior.
- [ ] Create minimal repository-scoped plan (PIV): scope, risks, tests, rollback, approval tier.
- [ ] Implement in reviewable PR(s), verify tests and demo against the exact branch HEAD.
- [ ] Record results, source URLs and evidence; mark unknowns **UNVERIFIED**.
- [ ] Obtain explicit user approval before merging or changing live systems.

## Priority
Fix credibility and reproducible vertical slices before adding more features. Apply canonical coden607/skills, smallest relevant skills, token efficiency and JEV routing when available; otherwise note unverified routing.
