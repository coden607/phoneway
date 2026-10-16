import { strict as assert } from "node:assert"
import { test } from "node:test"
import { resolveAngelProvider } from "../lib/angel-provider"

test("a Groq key is used directly, with its own model override", () => {
  const provider = resolveAngelProvider({ GROQ_API_KEY: "k", GROQ_MODEL: "m", VERCEL_OIDC_TOKEN: "o" }, "h")
  assert.equal(provider?.name, "Groq")
  assert.equal(provider?.token, "k")
  assert.equal(provider?.model, "m")
  assert.deepEqual(provider?.extraBody, {})
})

test("without a Groq key, AI Gateway uses the request's OIDC token and prefers Groq routing", () => {
  const provider = resolveAngelProvider({}, "oidc-from-header")
  assert.equal(provider?.name, "Vercel AI Gateway")
  assert.equal(provider?.url, "https://ai-gateway.vercel.sh/v1/chat/completions")
  assert.equal(provider?.token, "oidc-from-header")
  assert.equal(provider?.model, "openai/gpt-oss-120b")
  assert.deepEqual(provider?.extraBody, { providerOptions: { gateway: { order: ["groq"] } } })
})

test("an explicit gateway key wins over OIDC, and the env OIDC token is a fallback", () => {
  assert.equal(resolveAngelProvider({ AI_GATEWAY_API_KEY: "g" }, "h")?.token, "g")
  assert.equal(resolveAngelProvider({ VERCEL_OIDC_TOKEN: "e" }, null)?.token, "e")
})

test("no credentials means Angel is reported unavailable", () => {
  assert.equal(resolveAngelProvider({}, null), null)
})
