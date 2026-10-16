# GitHub Project Operating System

## The persona: Mission Control

**Mission Control** is a calm, privacy-first technical program manager for every
repository. It turns strategy into small, verifiable GitHub issues; keeps GitHub
as the engineering system of record; and publishes concise status to the tools
people already use.

Mission Control is:

- **Safety-led:** reliability, accessibility, privacy, and emergency paths beat
  speed. It never describes a prototype as a validated medical capability.
- **Evidence-driven:** every delivery item has an owner, acceptance criteria,
  risk, and a verification plan. A green deployment is not proof of a safe
  product outcome.
- **Quiet by default:** routine work stays in GitHub. Slack receives meaningful
  changes, Notion receives portfolio records, and Linear receives actionable
  engineering work only when those integrations are explicitly configured.
- **Least-privilege:** it never places secrets or personal, health, location, or
  payment data in an issue, notification, log, or project-management tool.
- **Human-controlled:** it may organize and report automatically, but production
  deploys, database migrations, payment activation, secret rotation, and external
  communications retain their existing approval gates.

## One workflow for every repository

### Systems of record

| Concern | System | Rule |
| --- | --- | --- |
| Code, review, CI, releases | GitHub | Always authoritative |
| Engineering planning | Linear | Recommended; mirror newly opened GitHub issues |
| Portfolio, decisions, launch notes | Notion | Optional; mirror newly opened GitHub issues |
| Team awareness | Slack | Optional; notify on issue, review, CI, and deployment events |
| Preview and production runtime | Vercel | Deploy only after the repository quality gate |
| Data and auth | Supabase | Migrations are reviewed, versioned, and promoted separately |
| Payments | Stripe | Enable only where a repository has a real payment surface |

Do not attempt to make all three planning tools authoritative. GitHub is the
stable common denominator. Choose Linear for execution, Notion for portfolio
context, and Slack for notifications; enable only what the team uses.

### Lifecycle

1. **Intake:** open a GitHub issue with outcome, scope, acceptance criteria,
   privacy/safety impact, and verification plan.
2. **Triage:** apply one `type:*`, one `priority:*`, and any applicable `area:*`
   labels. Assign an owner and milestone. Split work that cannot be reviewed as
   one coherent change.
3. **Plan:** link the issue to the GitHub Project. If configured, Mission Control
   mirrors the intake record to Linear and/or Notion and posts a short Slack
   notification.
4. **Build:** use a branch and pull request linked with `Closes #…`. Keep preview,
   development, and production credentials isolated.
5. **Verify:** CI is required. Changes to emergency flows, vitals, auth, data,
   payments, or migrations require focused tests and a rollback note.
6. **Review:** require code-owner review for sensitive areas. Resolve review and
   CI before merge; do not bypass branch protection.
7. **Release:** merge through the protected default branch. Vercel production
   remains environment-protected. Apply Supabase migrations and activate Stripe
   separately with explicit approval.
8. **Observe:** verify the live health, primary user journey, and critical safety
   paths. Record incidents and follow-ups in GitHub rather than relying on chat.

## Repository onboarding checklist

Start the interactive setup assistant from a local terminal, GitHub Codespace,
or iSH session connected to the repository host over SSH:

```bash
npm run setup:project-ops
```

The assistant begins with architecture and security recommendations, checks CLI
authentication, can start browser/device login flows, and uses provider CLIs for
secret entry so secret values never pass through the script. It does not deploy,
run migrations, or activate Stripe.

Copy `.github/workflows/project-ops.yml`, `.github/project-ops.json`,
`scripts/project-ops.mjs`, and the issue/PR templates into each repository.
Then:

1. Create `type:feature`, `type:bug`, `type:maintenance`, `priority:critical`,
   `priority:high`, `priority:normal`, and relevant `area:*` labels.
2. Create a GitHub Project with **Inbox → Ready → In progress → In review →
   Done**, and automate item addition from the repository.
3. Protect the default branch: pull request, required CI, conversation resolution,
   no force-push, and environment approval for production.
4. Configure Vercel's GitHub integration for previews. If GitHub Actions owns the
   production release, disable competing automatic production deployments.
5. Link a development/preview Supabase project first. Store migrations in Git;
   never expose the service-role key to a browser or untrusted workflow.
6. If payments exist, use Stripe test mode, implement verified webhook handling
   and idempotent fulfillment, and document refunds/support before requesting
   production activation. If payments do not exist, leave Stripe unconfigured.
7. Add only the integration variables actually used:

| Name | Kind | Purpose |
| --- | --- | --- |
| `SLACK_WEBHOOK_URL` | environment secret | Incoming webhook for project updates |
| `LINEAR_API_KEY` | environment secret | Create Linear issues |
| `LINEAR_TEAM_ID` | environment variable | Destination Linear team UUID |
| `NOTION_TOKEN` | environment secret | Create Notion database pages |
| `NOTION_DATABASE_ID` | environment variable | Destination database ID |

Create a GitHub environment named `project-ops` and place integration credentials
there so environment protection and access can be audited. The workflow skips any
adapter whose two required values are absent. Use dedicated bot credentials with
access to only the target channel, team, or database.

## Notion database shape

The Notion adapter expects a database whose title property is named `Name`. Add
optional URL, Status, Repository, Owner, Risk, and Target properties for human
planning; the automation deliberately writes only `Name` and the GitHub issue URL
to avoid schema coupling and accidental sensitive-data replication.

## Operating cadence

- **Daily:** owners update blocking issues; Slack carries exceptions, not status
  theater.
- **Weekly:** triage the inbox, review critical/high risks, dependency updates,
  failed CI, and aging pull requests.
- **Per release:** verify CI, preview, migration plan, feature flags, rollback,
  monitoring, and production approver.
- **Monthly:** archive stale work, review integration access, Supabase policies,
  GitHub permissions, Vercel environments, and Stripe webhook health where used.

## Failure and privacy behavior

Project synchronization is informational and must never block CI, review, or a
safety fix. A failed adapter fails only the Project Operations workflow and can be
re-run after configuration is corrected. Payloads contain repository, event,
title, actor, and GitHub URL only. Issue bodies, comments, commit messages, user
data, and environment values are never forwarded.
