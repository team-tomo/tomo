import * as z from "zod"

export const ACCOUNT_FIELD_LIMITS = {
  full_name: 50,
  username: 30,
  bio: 150,
  job_title: 50,
  phone: 11,
} as const

export const AccountSettingsSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(ACCOUNT_FIELD_LIMITS.full_name, {
      message: `Full name must be ${ACCOUNT_FIELD_LIMITS.full_name} characters or less`,
    }),
  username: z
    .string()
    .min(1, "Username is required")
    .max(ACCOUNT_FIELD_LIMITS.username, {
      message: `Username must be ${ACCOUNT_FIELD_LIMITS.username} characters or less`,
    }),
  bio: z
    .string()
    .min(1, "Bio is required")
    .max(ACCOUNT_FIELD_LIMITS.bio, {
      message: `Bio must be ${ACCOUNT_FIELD_LIMITS.bio} characters or less`,
    }),
  job_title: z.string().min(1, "Job title is required"),
  phone: z.string().min(1, "Phone is required"),
})

export const DISABLE_ACCOUNT_CONFIRMATION = "disable"

export const DangerZoneSchema = z
  .object({
    disable_account: z.boolean().refine((val) => val, {
      message: "You must agree to disable your account",
    }),
  })
  .refine((data) => data.disable_account, {
    message: "You must agree to disable your account",
    path: ["disable_account"],
  })

export const DisableAccountConfirmationSchema = z.object({
  confirmation: z
    .string()
    .refine((val): val is string => val === DISABLE_ACCOUNT_CONFIRMATION, {
      message: `Type "${DISABLE_ACCOUNT_CONFIRMATION}" to confirm`,
    }),
})

export type AccountSettingsInput = z.infer<typeof AccountSettingsSchema>
export type DangerZoneInput = z.input<typeof DangerZoneSchema>
export type DisableAccountConfirmationInput = z.input<
  typeof DisableAccountConfirmationSchema
>
