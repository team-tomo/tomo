import { apiFetch } from "@/lib/api"
import type {
  CreateInvitationInput,
  UserRole,
} from "@/schemas/manage-account-schema"
import type { AccountSettingsInput } from "@/schemas/settings-schema"

export type ProfileListItem = {
  id: string
  full_name: string
  username: string | null
  email: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  job_title: string | null
  bio: string | null
  phone: string | null
  manager_id: string | null
  created_at: string
}

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

export type ManagerOption = {
  id: string
  full_name: string | null
  username: string | null
  role: string
  job_title: string | null
}

export async function listManagers(): Promise<ManagerOption[]> {
  const res = await apiFetch("/account/managers")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to list leads (${res.status})`)
  }

  return res.json()
}

export async function listProfiles(): Promise<ProfileListItem[]> {
  const res = await apiFetch("/account/profiles")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to list profiles (${res.status})`)
  }

  return res.json()
}

export async function createInvitation(payload: CreateInvitationInput) {
  const res = await apiFetch("/auth/create-invitation", {
    method: "POST",
    body: JSON.stringify({
      code: payload.code,
      role: payload.role,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to create invitation code (${res.status})`
    )
  }

  return res.json()
}

export async function reassignManager(
  profileId: string,
  managerId: string
): Promise<void> {
  const res = await apiFetch(`/account/profiles/${profileId}/manager`, {
    method: "PATCH",
    body: JSON.stringify({ manager_id: managerId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to assign lead (${res.status})`)
  }
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
