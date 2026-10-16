#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

const rl = createInterface({ input: stdin, output: stdout })
const isInteractive = Boolean(stdin.isTTY && stdout.isTTY)

const run = (command, args, options = {}) => {
  const rendered = [command, ...args].join(" ")
  console.log(`\n$ ${rendered}`)
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, NO_UPDATE_NOTIFIER: "1", VERCEL_TELEMETRY_DISABLED: "1" },
    ...options,
  }).status === 0
}

const capture = (command, args) => spawnSync(command, args, {
  encoding: "utf8",
  shell: false,
  env: process.env,
})

const available = (command) => capture("sh", ["-c", `command -v "$1" >/dev/null 2>&1`, "sh", command]).status === 0

const confirm = async (question, defaultYes = false) => {
  if (!isInteractive) return false
  const hint = defaultYes ? "Y/n" : "y/N"
  const answer = (await rl.question(`${question} (${hint}) `)).trim().toLowerCase()
  return answer ? answer === "y" || answer === "yes" : defaultYes
}

const heading = (title) => console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`)

heading("Mission Control setup recommendations")
console.log(`
1. Keep GitHub authoritative for code, issues, review, CI, and releases.
2. Use Linear for engineering execution, Notion for portfolio context, and
   Slack for notifications. Configure only the tools your team will maintain.
3. Keep development, preview, and production credentials separate.
4. Never copy database passwords, Supabase service-role keys, Stripe secret
   keys, or provider access tokens into browser-visible NEXT_PUBLIC_* values.
5. Leave Stripe disabled until checkout, signature-verified webhooks,
   idempotent fulfillment, refunds/support, and payment tests exist.
6. This assistant runs browser/device login commands but never asks you to paste
   provider tokens into this script. Provider CLIs store their own credentials.
`)

if (!isInteractive) {
  console.error("This setup assistant requires an interactive terminal (TTY).")
  console.error("Run it locally, in GitHub Codespaces, or through iSH connected by SSH:")
  console.error("  npm run setup:project-ops")
  process.exitCode = 2
  await rl.close()
  process.exit()
}

heading("1. GitHub")
if (!available("gh")) {
  console.log("GitHub CLI is missing. Install it from https://cli.github.com/")
} else if (capture("gh", ["auth", "status", "--hostname", "github.com"]).status === 0) {
  console.log("GitHub CLI is authenticated.")
} else if (await confirm("Authenticate GitHub CLI using the browser/device flow now?", true)) {
  run("gh", ["auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web", "--skip-ssh-key"])
}

const remote = capture("git", ["remote", "get-url", "origin"])
if (remote.status === 0) {
  console.log(`Origin is configured: ${remote.stdout.trim()}`)
} else {
  console.log("No origin remote is configured.")
  const repo = (await rl.question("Optional GitHub OWNER/REPOSITORY (press Enter to skip): ")).trim()
  if (repo && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    if (await confirm(`Add https://github.com/${repo}.git as origin?`)) {
      run("git", ["remote", "add", "origin", `https://github.com/${repo}.git`])
    }
  } else if (repo) {
    console.log("Skipped: repository must use OWNER/REPOSITORY format.")
  }
}

heading("2. Optional project-management adapters")
console.log("Create the GitHub environment first, then add only selected adapters.")
if (available("gh") && capture("gh", ["auth", "status", "--hostname", "github.com"]).status === 0) {
  const repo = (await rl.question("Target GitHub OWNER/REPOSITORY (press Enter to infer from origin): ")).trim()
  const repoArgs = repo ? ["--repo", repo] : []
  if (await confirm("Configure the project-ops environment variables/secrets now?")) {
    console.log("GitHub CLI will securely prompt for each selected secret; input is not handled by this script.")
    if (await confirm("Enable Slack notifications?")) {
      run("gh", ["secret", "set", "SLACK_WEBHOOK_URL", "--env", "project-ops", ...repoArgs])
    }
    if (await confirm("Enable Linear issue mirroring?")) {
      run("gh", ["secret", "set", "LINEAR_API_KEY", "--env", "project-ops", ...repoArgs])
      const teamId = (await rl.question("Linear team UUID (not a secret): ")).trim()
      if (teamId) run("gh", ["variable", "set", "LINEAR_TEAM_ID", "--env", "project-ops", "--body", teamId, ...repoArgs])
    }
    if (await confirm("Enable Notion issue mirroring?")) {
      run("gh", ["secret", "set", "NOTION_TOKEN", "--env", "project-ops", ...repoArgs])
      const databaseId = (await rl.question("Notion database ID (not a secret): ")).trim()
      if (databaseId) run("gh", ["variable", "set", "NOTION_DATABASE_ID", "--env", "project-ops", "--body", databaseId, ...repoArgs])
    }
  }
} else {
  console.log("Skipped adapter configuration because GitHub CLI is not authenticated.")
}

heading("3. Vercel")
console.log("Recommendation: use Git integration for previews and one protected owner for production deploys.")
if (await confirm("Authenticate Vercel CLI using its browser flow now?")) {
  const authenticated = run("npx", ["--yes", "vercel@59.11.2", "login"])
  if (authenticated && await confirm("Link this directory to a Vercel project?")) {
    run("npx", ["--yes", "vercel@59.11.2", "link"])
  } else if (!authenticated) {
    console.log("Vercel login did not complete; project linking was skipped.")
  }
}

heading("4. Supabase")
console.log("Recommendation: link development/preview first; do not apply a production migration from this assistant.")
if (await confirm("Authenticate Supabase CLI using its browser flow now?")) {
  const authenticated = run("npx", ["--yes", "supabase@latest", "login"])
  if (authenticated) {
    console.log("Link explicitly with: npx supabase@latest link --project-ref PROJECT_REF")
  } else {
    console.log("Supabase login did not complete. Create a token at https://supabase.com/dashboard/account/tokens")
    console.log("Then run: npx supabase@latest login --token YOUR_TOKEN")
  }
}

heading("5. Stripe")
console.log("Stripe remains intentionally disabled: no checkout and verified fulfillment implementation was detected.")
console.log("When that implementation exists, start in test mode at https://dashboard.stripe.com/test/apikeys")

heading("Setup complete")
console.log("Review provider scopes, GitHub environment protection, and the planned target before any production change.")
console.log("Run the quality gate with: npm run verify")

await rl.close()
