import { NextResponse } from "next/server"
import {
  angelRequestSchema,
  buildChatMessages,
  FIND_RESOURCES_TOOL,
  findResourcesArgsSchema,
  safetyNotices,
} from "@/lib/angel-ai"
import { resolveAngelProvider, type AngelProvider } from "@/lib/angel-provider"
import { lookupResources, type ResourceLookup } from "@/lib/resource-lookup"

// Conversations are relayed to the AI provider to generate a reply and are not stored or logged by NarcoGuard.
// Upstream directories and the AI provider can be slow; allow time for one fallback attempt.
export const maxDuration = 60

const noStore = { "Cache-Control": "private, no-store" }

// Best-effort per-instance limit so one client cannot exhaust the free-tier quota.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 12
const recent = new Map<string, number[]>()
function rateLimited(key: string, now = Date.now()) {
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(key, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > MAX_PER_WINDOW
}

type ChatMessage = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } }

class ProviderError extends Error {
  constructor(readonly status: number, readonly detail = "") { super(`provider ${status}`) }
}

async function complete(provider: AngelProvider, messages: ChatMessage[], withTools: boolean, maxTokens = 1024) {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.4,
      max_completion_tokens: maxTokens,
      ...provider.extraBody,
      ...(withTools ? { tools: [FIND_RESOURCES_TOOL], tool_choice: "auto" } : {}),
    }),
    signal: AbortSignal.timeout(25_000),
  })
  // The provider's own error text (never our request content) helps diagnose access problems.
  if (!response.ok) throw new ProviderError(response.status, (await response.text().catch(() => "")).slice(0, 300))
  const body = (await response.json()) as { choices?: { message?: ChatMessage }[] }
  const message = body.choices?.[0]?.message
  if (!message) throw new ProviderError(0)
  return message
}

const providerFor = (request: Request) => resolveAngelProvider(process.env, request.headers.get("x-vercel-oidc-token"))

export async function GET(request: Request) {
  const provider = providerFor(request)
  // Preview-only health probe with a fixed prompt (no user content) to verify provider access.
  if (new URL(request.url).searchParams.has("probe") && process.env.VERCEL_ENV !== "production") {
    if (!provider) return NextResponse.json({ ok: false, provider: null }, { headers: noStore })
    try {
      const reply = await complete(provider, [{ role: "system", content: "Reply with the single word OK." }, { role: "user", content: "ping" }], false, 64)
      return NextResponse.json({ ok: true, provider: provider.name, model: provider.model, reply: reply.content?.slice(0, 40) ?? null }, { headers: noStore })
    } catch (error) {
      return NextResponse.json({ ok: false, provider: provider.name, status: error instanceof ProviderError ? error.status : "network", detail: error instanceof ProviderError ? error.detail : undefined }, { headers: noStore })
    }
  }
  return NextResponse.json({ available: Boolean(provider), provider: provider?.name ?? null }, { headers: noStore })
}

export async function POST(request: Request) {
  const provider = providerFor(request)
  if (!provider) return NextResponse.json({ available: false, message: "Angel AI is not configured yet." }, { status: 503, headers: noStore })

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(forwarded)) return NextResponse.json({ error: "Too many messages. Wait a minute and try again." }, { status: 429, headers: noStore })

  const parsed = angelRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400, headers: noStore })

  const latest = parsed.data.messages.at(-1)
  const notices = latest?.role === "user" ? safetyNotices(latest.content) : []
  const messages: ChatMessage[] = buildChatMessages(parsed.data)

  try {
    let reply = await complete(provider, messages, true)
    let resources: (ResourceLookup & { kind: string }) | undefined
    const call = reply.tool_calls?.find((c) => c.function?.name === "find_resources")
    if (call) {
      let args: unknown = null
      try { args = JSON.parse(call.function.arguments) } catch { /* invalid arguments are reported to the model below */ }
      const valid = findResourcesArgsSchema.safeParse(args)
      const result = valid.success ? { kind: valid.data.kind, ...(await lookupResources(valid.data.kind, { zip: valid.data.zip })) } : undefined
      resources = result
      messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: [call] })
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result
          ? { status: result.status, results: result.results.map(({ name, address, phone, distanceMiles, source }) => ({ name, address, phone, distanceMiles, source })), fallback: result.fallback }
          : { error: "A valid kind and 5-digit ZIP code are required." }),
      })
      reply = await complete(provider, messages, false)
    }
    const text = reply.content?.trim() || "I couldn't put together a reply. Please try asking another way."
    return NextResponse.json({ available: true, notices, reply: text, resources }, { headers: noStore })
  } catch (error) {
    // Only the provider name and HTTP status are logged, never message content.
    console.warn(`[angel] ${provider.name} request failed: ${error instanceof ProviderError ? error.status : "network"}`)
    // Rejected credentials or an account not yet enabled (e.g. AI Gateway before a card is on file):
    // report Angel as switched off rather than as a temporary failure.
    if (error instanceof ProviderError && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ available: false, notices, message: "Angel AI is not switched on yet." }, { status: 503, headers: noStore })
    }
    return NextResponse.json({ available: true, notices, error: "Angel couldn't respond right now. Try again, or use the search below." }, { status: 502, headers: noStore })
  }
}
