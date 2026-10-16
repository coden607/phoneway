// End-to-end encrypted backup for account sync. Data is sealed in the browser with a key derived
// from a passphrase the server never receives (PBKDF2-SHA-256 → AES-256-GCM). Losing the
// passphrase means the backup cannot be opened, by the person or by NarcoGuard.

export const VAULT_ITERATIONS = 600_000
export const MIN_PASSPHRASE_LENGTH = 10

export interface SealedVault {
  v: 1
  kdf: "PBKDF2-SHA-256"
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

const toB64 = (bytes: Uint8Array) => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
const fromB64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}

export async function sealVault(data: unknown, passphrase: string, iterations = VAULT_ITERATIONS): Promise<SealedVault> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new Error(`Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt, iterations)
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data))))
  return { v: 1, kdf: "PBKDF2-SHA-256", iterations, salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(ciphertext) }
}

/** Returns null for a wrong passphrase or a damaged backup (AES-GCM authenticates the data). */
export async function openVault<T = unknown>(sealed: SealedVault, passphrase: string): Promise<T | null> {
  try {
    if (!isSealedVault(sealed)) return null
    const key = await deriveKey(passphrase, fromB64(sealed.salt), sealed.iterations)
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(sealed.iv) as BufferSource }, key, fromB64(sealed.ciphertext) as BufferSource)
    return JSON.parse(new TextDecoder().decode(plain)) as T
  } catch {
    return null
  }
}

const b64 = /^[A-Za-z0-9+/]+={0,2}$/

/** Shape check used by the server, which can validate but never read a vault. */
export function isSealedVault(value: unknown): value is SealedVault {
  if (!value || typeof value !== "object") return false
  const vault = value as Record<string, unknown>
  return vault.v === 1 && vault.kdf === "PBKDF2-SHA-256" && Number.isInteger(vault.iterations) && (vault.iterations as number) >= 100_000 && (vault.iterations as number) <= 5_000_000 &&
    typeof vault.salt === "string" && b64.test(vault.salt) && vault.salt.length <= 64 &&
    typeof vault.iv === "string" && b64.test(vault.iv) && vault.iv.length <= 32 &&
    typeof vault.ciphertext === "string" && b64.test(vault.ciphertext) && vault.ciphertext.length <= 96_000 &&
    Object.keys(vault).length === 6
}
