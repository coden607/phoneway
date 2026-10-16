import { NextResponse } from "next/server"
import { z } from "zod"
import { clearSession, ensureProfile, getSession, isAuthConfigured, signIn, signUp, storeSession } from "@/lib/supabase-auth"

const schema = z.object({
  action: z.enum(["login", "signup", "logout"]),
  email: z.string().trim().pipe(z.email().max(254)).optional(),
  password: z.string().min(8).max(128).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
})

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function GET() {
  if (!isAuthConfigured()) return NextResponse.json({ available: false, authenticated: false, user: null }, { headers: { "Cache-Control": "private, no-store" } })
  try {
    const user = await getSession()
    return NextResponse.json({ available: true, authenticated: Boolean(user), user: user ? { id: user.id, email: user.email } : null })
  } catch {
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 })
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 })
  if (!isAuthConfigured()) return NextResponse.json({ error: "Accounts are not switched on yet. Everything else works without one." }, { status: 503 })
  try {
    const input = schema.parse(await request.json())
    if (input.action === "logout") {
      await clearSession()
      return NextResponse.json({ success: true })
    }
    if (!input.email || !input.password || (input.action === "signup" && !input.displayName)) return NextResponse.json({ error: "Email, password, and display name are required" }, { status: 400 })
    const displayName = input.displayName
    const session = input.action === "signup" ? await signUp(input.email, input.password, displayName as string) : await signIn(input.email, input.password)
    if (!session?.access_token || !session.refresh_token) return NextResponse.json({ error: "Authentication failed or email confirmation is required" }, { status: 401 })
    await storeSession(session)
    await ensureProfile(session, displayName ?? session.user?.email?.split("@")[0] ?? "NarcoGuard user")
    return NextResponse.json({ success: true, user: session.user ? { id: session.user.id, email: session.user.email } : null })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid account details" }, { status: 400 })
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 })
  }
}
