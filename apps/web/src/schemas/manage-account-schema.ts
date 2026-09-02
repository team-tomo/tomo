import * as z from "zod"

export const UserRoleSchema = z.enum([
  "dev",
  "executive",
  "support",
  "lead",
  "ic",
])

export const CreateInvitationSchema = z.object({
  code: z.string().trim().min(1, "Invitation code is required"),
  role: UserRoleSchema,
})

export type UserRole = z.infer<typeof UserRoleSchema>

export const ADMIN_USER_ROLES = [
  "dev",
  "executive",
  "support",
] as const satisfies readonly UserRole[]

export function isAdminUserRole(role: string | null | undefined): boolean {
  return (
    typeof role === "string" &&
    (ADMIN_USER_ROLES as readonly string[]).includes(role)
  )
}

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>
