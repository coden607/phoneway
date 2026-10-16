// Practical offers a Hero publishes: rides, food, clothing, or anything else
// concrete. Offers are deliberately independent of overdose certification - a
// person offering a ride is not claiming to be a trained responder - and an
// offer is visible only while its owner has explicitly activated it.
//
// Nothing here implies a provider or service is verified or guaranteed. The
// contact value is published by the owner for this offer alone, so it is
// validated to a real phone number and never rendered as a free-form link.

export const OFFER_CATEGORIES = ["transportation", "food", "clothing", "other"] as const
export type OfferCategory = (typeof OFFER_CATEGORIES)[number]

export const CONTACT_METHODS = ["call", "text"] as const
export type ContactMethod = (typeof CONTACT_METHODS)[number]

export type OfferContact = { method: ContactMethod; value: string } | null

export type NewHeroOffer = {
  category: OfferCategory
  title: string
  description: string
  contact: OfferContact
  active: boolean
}

export type HeroOffer = NewHeroOffer & { id: string; updatedAt: string }

export const TITLE_MAX = 80
export const DESCRIPTION_MAX = 400

type Validated<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Normalizes a published contact number to E.164, or returns null when the
 * input is not a phone number. US 10- and 11-digit forms are accepted because
 * that is what people type; everything else must already be E.164.
 */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!/^[+()\-.\s\d]{7,24}$/.test(trimmed)) return null
  const digits = trimmed.replace(/\D/g, "")
  if (trimmed.startsWith("+")) return /^\d{8,15}$/.test(digits) ? `+${digits}` : null
  if (/^\d{10}$/.test(digits)) return `+1${digits}`
  if (/^1\d{10}$/.test(digits)) return `+${digits}`
  return null
}

/** A tappable destination for a published contact, or null when it is not one. */
export function contactHref(contact: OfferContact): string | null {
  if (!contact || !CONTACT_METHODS.includes(contact.method)) return null
  const value = normalizePhone(contact.value)
  if (!value) return null
  return `${contact.method === "call" ? "tel" : "sms"}:${value}`
}

function validateContact(input: unknown): Validated<OfferContact> {
  if (input === null || input === undefined) return { success: true, data: null }
  if (typeof input !== "object" || Array.isArray(input)) return { success: false, error: "Contact must be a call or text number, or left out." }
  const { method, value } = input as Record<string, unknown>
  if (typeof method !== "string" || !CONTACT_METHODS.includes(method as ContactMethod)) {
    return { success: false, error: "Contact method must be call or text." }
  }
  const phone = normalizePhone(value)
  if (!phone) return { success: false, error: "Contact needs a valid phone number." }
  return { success: true, data: { method: method as ContactMethod, value: phone } }
}

export function validateOffer(input: unknown): Validated<NewHeroOffer> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "An offer must be an object." }
  }
  const { category, title, description, contact, active } = input as Record<string, unknown>

  if (typeof category !== "string" || !OFFER_CATEGORIES.includes(category as OfferCategory)) {
    return { success: false, error: `Category must be one of: ${OFFER_CATEGORIES.join(", ")}.` }
  }
  if (typeof title !== "string" || !title.trim()) return { success: false, error: "A title is required." }
  const trimmedTitle = title.trim()
  if (trimmedTitle.length > TITLE_MAX) return { success: false, error: `A title must be ${TITLE_MAX} characters or fewer.` }

  if (description !== undefined && typeof description !== "string") {
    return { success: false, error: "A description must be text." }
  }
  const trimmedDescription = (description as string | undefined)?.trim() ?? ""
  if (trimmedDescription.length > DESCRIPTION_MAX) {
    return { success: false, error: `A description must be ${DESCRIPTION_MAX} characters or fewer.` }
  }

  if (active !== undefined && typeof active !== "boolean") return { success: false, error: "Active must be true or false." }

  const validContact = validateContact(contact)
  if (!validContact.success) return validContact

  return {
    success: true,
    data: {
      category: category as OfferCategory,
      title: trimmedTitle,
      description: trimmedDescription,
      contact: validContact.data,
      // Inactive until the owner turns it on, so nothing is published by accident.
      active: active === true,
    },
  }
}

export type HeroOfferRow = {
  id: string
  category: OfferCategory
  title: string
  description: string | null
  contact_method: ContactMethod | null
  contact_value: string | null
  active: boolean
  updated_at: string
}

export const toHeroOffer = (row: HeroOfferRow): HeroOffer => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description ?? "",
  contact: row.contact_method && row.contact_value ? { method: row.contact_method, value: row.contact_value } : null,
  active: row.active,
  updatedAt: row.updated_at,
})

export const toHeroOfferRow = (offer: NewHeroOffer) => ({
  category: offer.category,
  title: offer.title,
  description: offer.description,
  contact_method: offer.contact?.method ?? null,
  contact_value: offer.contact?.value ?? null,
  active: offer.active,
})
