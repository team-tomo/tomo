import * as z from "zod"

export const ClockOutSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(1, { message: "Notes are required" })
    .max(200, { message: "Notes must be less than 200 characters" }),
})

const manilaDate = (offsetDays = 0) => {
  const manilaDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  })
  const d = new Date(`${manilaDateStr}T00:00:00`)
  d.setDate(d.getDate() + offsetDays)
  return d
}

export const LeaveRequestSchema = z
  .object({
    leave_type: z.enum(["VL", "SL", "EL", "ML", "PL"], {
      message: "Please select leave you want to request",
    }),
    start_date: z
      .string({ message: "Start date is required" })
      .min(1, { message: "Start date is required" })
      .refine((date) => new Date(date) >= manilaDate(-1), {
        message: "Start date cannot be earlier than yesterday",
      }),
    end_date: z
      .string({ message: "End date is required" })
      .min(1, { message: "End date is required" })
      .refine((date) => new Date(date) >= manilaDate(-1), {
        message: "End date cannot be earlier than yesterday",
      }),
    approver: z.uuid({ message: "Please select an approver" }),
    reason: z
      .string()
      .trim()
      .min(1, { message: "Reason is required" })
      .max(200, { message: "Reason must be less than 200 characters" }),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) < new Date(data.start_date)) {
        ctx.addIssue({
          code: "custom",
          message: "End date must be on or after the start date",
          path: ["end_date"],
        })
      }
    }
  })

export type ClockOutInput = z.infer<typeof ClockOutSchema>
