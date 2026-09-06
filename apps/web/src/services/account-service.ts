import { apiFetch } from "@/lib/api"
import type { AccountSettingsInput } from "@/schemas/settings-schema"

function toAccountSettings(
  row: {
    full_name?: string | null
    username?: string | null
    bio?: string | null
    job_title?: string | null
    phone?: string | null
  } | null
): AccountSettingsInput {
  return {
    full_name: row?.full_name ?? "",
    username: row?.username ?? "",
    bio: row?.bio ?? "",
    job_title: row?.job_title ?? "",
    phone: row?.phone ?? "",
  }
}

export async function getAccountProfile(): Promise<AccountSettingsInput> {
  const res = await apiFetch("/account/profile")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to fetch profile (${res.status})`)
  }

  return toAccountSettings(await res.json())
}

export async function updateProfile(
  payload: AccountSettingsInput
): Promise<AccountSettingsInput> {
  const res = await apiFetch("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to update profile (${res.status})`)
  }

  return toAccountSettings(await res.json())
}
