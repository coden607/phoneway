import { json } from "@/lib/api-helpers"
import { watchRegistryAvailable } from "@/lib/watch-registry"

export const dynamic = "force-dynamic"

export async function GET() {
  return json({ available: await watchRegistryAvailable() })
}
