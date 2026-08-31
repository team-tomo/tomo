import * as z from "zod"

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const RegisterSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirm_password: z.string(),
    invitation_code: z.string().min(1, "Invitation code is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm_password) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords don't match",
        path: ["confirm_password"],
      })
    }
  })

export const ResetPasswordSchema = z.object({
  email: z.email("Invalid email address"),
})

export const ChangePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirm_password: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm_password) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords don't match",
        path: ["confirm_password"],
      })
    }
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
