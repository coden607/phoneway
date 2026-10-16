---
name: release
description: Ship NarcoGuard safely - integrate a branch, run the full gate, deploy and verify a Vercel preview, open and merge the PR, deploy production after explicit human approval, and verify www.narcoguard.app live. Use when asked to release, ship, deploy or promote to production.
---

# NarcoGuard release

Emergency and health copy is safety-critical. Never ship a claim that a capability exists when it does not.

## 1. Integrate
- Start from the latest `main` (`git fetch origin main`); work on `release/<date>` or the feature branch.
- Review `git status` and the full diff. Merge `main` in if it moved; never rewrite shared history.

## 2. Gate (all must pass, no bypasses)
- `npm ci` then `npm run verify` (lint with zero warnings, env inventory, typecheck, claims scan, unit suites, `audit:deps`, build, PWA tests).
- If a check fails, fix the root cause. Do not disable rules, skip tests, loosen the audit gate or add peer-dependency overrides.
- Lighthouse: `npx @lhci/cli@0.15.1 autorun --config=lighthouserc.js` against `npm start`; no assertion failures.
- For UI changes, compare full-page screenshots of every route before and after; explain every difference.

## 3. Preview
- Push the branch and deploy a preview (Vercel `create_deployment` with the branch `gitSource`, no `target`).
- Verify over HTTP: key pages 200, `/manifest.webmanifest`, `/sw.js`, `/robots.txt`, `/sitemap.xml`, `/api/vitals` returns its explicit 503 "not configured" contract.

## 4. Approval and merge
- Summarize for the owner: commits, what changed, what was left out and why, risks, preview URL. Wait for an explicit "ship it".
- Open a PR using `.github/pull_request_template.md`; merge only when every CI check is green and the PR is mergeable.

## 5. Production
- The GitHub "Vercel Production" workflow needs the `VERCEL_TOKEN` secret. Without it, deploy `main` at the merge SHA with `create_deployment` and `target: "production"`.
- Confirm the deployment is READY and aliased to `www.narcoguard.app` and `narcoguard.app`.

## 6. Verify live
- `narcoguard.app` 308-redirects to `www`; `<html data-dpl-id>` matches the new deployment.
- Pages, manifest, service worker, robots, sitemap and the vitals contract behave as on preview.
- Confirm safety copy in the served JavaScript (follow the page chunks), not only in source.
- Record the rollback target (previous production deployment ID) in the summary.
