import { ANGEL_DEFAULT_MODEL } from "@/lib/angel-ai"

// Which AI endpoint Angel uses. A Groq key, when set, is used directly. Otherwise, on Vercel, Angel
// uses Vercel AI Gateway, which authenticates with the deployment's own OIDC token (no key to
// manage) and is asked to route the same open model to Groq first.

export interface AngelProvider {
  name: "Groq" | "Vercel AI Gateway"
  url: string
  token: string
  model: string
  /** Provider-specific request fields merged into every chat completion request. */
  extraBody: Record<string, unknown>
}

type Env = Record<string, string | undefined>

export function resolveAngelProvider(env: Env, oidcHeader: string | null): AngelProvider | null {
  if (env.GROQ_API_KEY) {
    const model = env.GROQ_MODEL || ANGEL_DEFAULT_MODEL
    return {
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      token: env.GROQ_API_KEY,
      model,
      extraBody: model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {},
    }
  }
  const gatewayToken = env.AI_GATEWAY_API_KEY || oidcHeader || env.VERCEL_OIDC_TOKEN
  if (gatewayToken) {
    return {
      name: "Vercel AI Gateway",
      url: "https://ai-gateway.vercel.sh/v1/chat/completions",
      token: gatewayToken,
      model: env.ANGEL_GATEWAY_MODEL || ANGEL_DEFAULT_MODEL,
      extraBody: { providerOptions: { gateway: { order: ["groq"] } } },
    }
  }
  return null
}
