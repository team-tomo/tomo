import type { User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import type { LoginInput, RegisterInput } from "@/schemas/auth-schema"

const API_URL = import.meta.env.VITE_API_URL

/**
 * Sign in with email and password
 * @param data - Users email and password
 */
export async function signInWithEmail(data: LoginInput): Promise<User> {
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    throw error
  }

  return authData.user
}

type SignUpResponse = {
  session?: {
    access_token?: string
    refresh_token?: string
  } | null
}

/**
 * Sign up with email and password
 * @param data - Users full name, email, password, and invitation code
 * @returns User object
 */
export async function signUpWithEmail(data: RegisterInput): Promise<User> {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    body: JSON.stringify({
      full_name: data.full_name,
      email: data.email,
      password: data.password,
      invitation_code: data.invitation_code,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || `Failed to sign up (${response.status})`)
  }

  const body = (await response.json()) as SignUpResponse
  const accessToken = body.session?.access_token
  const refreshToken = body.session?.refresh_token

  if (!accessToken || !refreshToken) {
    throw new Error(
      "Account created but no session was returned. Please sign in."
    )
  }

  const { data: authData, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    throw error
  }

  if (!authData.user) {
    throw new Error("Failed to establish session after signup")
  }

  return authData.user
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
