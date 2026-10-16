import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path) throw new Error("Usage: node handoff.mjs <reviewed-handoff.md>");

const provider = process.env.HANDOFF_PROVIDER || "openrouter";
const providers = {
  openrouter: {
    key: process.env.OPENROUTER_API_KEY,
    keyName: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: process.env.HANDOFF_MODEL || "openrouter/free",
  },
  cline: {
    key: process.env.CLINE_API_KEY,
    keyName: "CLINE_API_KEY",
    url: "https://api.cline.bot/api/v1/chat/completions",
    model: process.env.HANDOFF_MODEL || "openai/gpt-4o",
  },
};
const config = providers[provider];
if (!config) throw new Error(`Unsupported HANDOFF_PROVIDER: ${provider}`);
if (!config.key) throw new Error(`${config.keyName} is not set`);

const context = await readFile(path, "utf8");
if (context.length > 30_000) throw new Error("Handoff exceeds 30,000 characters");
const credential = /(sk-[a-z0-9_-]{16,}|bearer\s+\S{16,}|api[_-]?key\s*[:=]\s*\S+)/i;
if (credential.test(context)) throw new Error("Potential credential detected; redact it first");

const response = await fetch(config.url, {
  method: "POST",
  headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: "Continue from this user-reviewed handoff. Do not invent completed actions." },
      { role: "user", content: context },
    ],
  }),
});
if (!response.ok) throw new Error(`${provider} request failed (${response.status})`);
const data = await response.json();
const output = data?.choices?.[0]?.message?.content;
if (typeof output !== "string") throw new Error(`${provider} returned no text`);
process.stdout.write(`${output}\n`);
