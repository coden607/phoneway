import Link from "next/link"
import React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"

export const metadata = { title: "Founding Constitution — NarcoGuard" }

export default function ConstitutionPage() {
  const text = readFileSync(join(process.cwd(), "docs/governance/CONSTITUTION.md"), "utf8")
  const submissionUrl = "https://github.com/coden607/narcoguard-pwa/issues/new?template=constitution.yml"
  const actions = ["Support", "Object", "Propose Change", "Submit Evidence", "Identify Harm", "Constitutional Challenge"]
  return <main className="max-w-4xl mx-auto p-5 sm:p-10 flex flex-col gap-6">
    <Link href="/" className="self-start underline text-primary">← NarcoGuard dashboard</Link>
    <div className="border rounded-xl p-6 space-y-3">
      <h1 className="text-3xl font-bold">NarcoGuard Founding Constitution</h1>
      <p className="font-semibold">FOUNDING DRAFT — NOT YET RATIFIED</p>
      <p>Version 0.2 draft · Published October 1, 2026 · Source: approved September 18 community governance design.</p>
      <p>This draft invites criticism and revision. Its proposed commitments are not currently enforceable. It does not grant binding governance authority or change emergency behavior.</p>
      <h2 className="text-xl font-semibold">Take part in the founding discussion</h2>
      <p>These submissions are advisory. The GitHub issue number is the durable public record; comments and linked pull requests show review and revisions. No vote or donation grants additional authority.</p>
      <ul className="grid gap-2 sm:grid-cols-2">{actions.map((action) => <li key={action}><a className="underline text-primary" href={submissionUrl} target="_blank" rel="noopener noreferrer">{action} ↗</a></li>)}</ul>
      <p className="text-sm">GitHub issues are public and require an account. Do not include health records, location, contact details or anyone else&apos;s private information. For feedback that should not be public, email <a className="underline" href="mailto:narcoguard607@gmail.com?subject=NarcoGuard%20Constitution%20feedback">narcoguard607@gmail.com</a>. Email is not a secure emergency channel. Submissions do not change the Constitution automatically.</p>
    </div>
    <article className="whitespace-pre-wrap wrap-break-word leading-relaxed border rounded-xl p-6">{text}</article>
  </main>
}
