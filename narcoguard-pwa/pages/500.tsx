import Link from "next/link"

export default function Custom500() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">NarcoGuard</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Something went wrong</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
          We could not load this page. Return to the dashboard and try again.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-400/20"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
