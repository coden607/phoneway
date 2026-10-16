import { z } from "zod"
import { RESOURCE_KINDS } from "@/lib/resource-finder"

// Angel AI: a conversational guide for finding help and working toward personal goals. It is not an
// emergency service, a clinician or a monitor. Emergency guidance is deterministic (below), so it
// never depends on what the model says.

export const ANGEL_DEFAULT_MODEL = "openai/gpt-oss-120b"
export const MAX_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 2000

export const angelRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) })).min(1).max(MAX_MESSAGES),
  zip: z.string().regex(/^\d{5}$/).optional(),
})
export type AngelRequest = z.infer<typeof angelRequestSchema>

export const ANGEL_SYSTEM_PROMPT = [
  "You are Angel, the assistant inside the NarcoGuard app. You help people find practical help (food, shelter, water, toilets, showers, laundry, emergency rooms, clinics, pharmacies that sell naloxone, treatment, community centers, libraries and job help) and break their own goals into small, concrete next steps.",
  "Be warm, brief and non-judgmental. Use plain language at about a 6th-grade reading level. Respect the person's choices; they decide what to do.",
  "Safety rules you must always follow:",
  "- If anyone may be overdosing, unresponsive, not breathing or in danger, tell them to call 911 now, give naloxone if available, and do rescue breathing if trained. Put this first.",
  "- For thoughts of suicide or a mental health or substance use crisis, share the 988 Suicide & Crisis Lifeline (call or text 988).",
  "- You are not a doctor, lawyer or emergency service. Do not diagnose, give dosing instructions, or say whether someone is safe. Do not claim NarcoGuard monitors anyone, detects overdoses or contacts anyone.",
  "- Never promise that a service has openings, a bed, a meal or an appointment. Say listings come from public directories and to call first.",
  "- Do not ask for full names, exact addresses or other identifying details. Do not repeat back sensitive details unnecessarily.",
  "- To find places near the person, call the find_resources tool. It needs a 5-digit ZIP code; if you do not have one, ask for it or suggest the 'Find everything near me' search on this page, which can use their location.",
  "- Overdose Good Samaritan laws differ by state and are limited; suggest the app's state summary and checking the statute rather than giving legal advice.",
].join("\n")

export const FIND_RESOURCES_TOOL = {
  type: "function",
  function: {
    name: "find_resources",
    description: "Find nearby places for one need (treatment, food, shelter, pharmacy, drinking water, toilets, showers, laundry, emergency room, clinic, community center, library or job help) from public directories (SAMHSA FindTreatment.gov and OpenStreetMap).",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: [...RESOURCE_KINDS] },
        zip: { type: "string", description: "5-digit US ZIP code" },
      },
      required: ["kind", "zip"],
      additionalProperties: false,
    },
  },
} as const

export const findResourcesArgsSchema = z.object({ kind: z.enum(RESOURCE_KINDS), zip: z.string().regex(/^\d{5}$/) })

const EMERGENCY_PATTERN = /\b(overdos\w*|od'?(ing|ed)?|not breathing|stopped breathing|can'?t breathe|unresponsive|won'?t wake|passed out|blue lips|turning blue|dying)\b/i
const CRISIS_PATTERN = /\b(suicid\w*|kill (myself|me)|end (it all|my life)|want to die|self[- ]harm|hurt myself)\b/i

export const EMERGENCY_NOTICE = "If someone may be overdosing or isn't breathing: call 911 now, give naloxone (Narcan) if you have it, and stay with them."
export const CRISIS_NOTICE = "You can call or text 988 any time to reach the Suicide & Crisis Lifeline. If you are in immediate danger, call 911."

/** Deterministic safety notices for the latest message, shown before any model reply. */
export function safetyNotices(text: string): string[] {
  const notices: string[] = []
  if (EMERGENCY_PATTERN.test(text)) notices.push(EMERGENCY_NOTICE)
  if (CRISIS_PATTERN.test(text)) notices.push(CRISIS_NOTICE)
  return notices
}

/** Builds the provider request; the system prompt is always first and the ZIP is offered only if the person shared it. */
export function buildChatMessages(request: AngelRequest) {
  const context = request.zip ? [{ role: "system" as const, content: `The person shared ZIP code ${request.zip} for resource searches.` }] : []
  return [{ role: "system" as const, content: ANGEL_SYSTEM_PROMPT }, ...context, ...request.messages]
}
