import { supabase } from "@/lib/supabase"

const API_URL = import.meta.env.VITE_API_URL

/**
 * Fetch wrapper that automatically attaches the current Supabase JWT as a Bearer token.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error("Not authenticated")

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${session.access_token}`)
  headers.set("Content-Type", "application/json")

  return fetch(`${API_URL}${path}`, { ...init, headers })
}
