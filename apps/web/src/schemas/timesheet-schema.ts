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

function clockOrder(value: string) {
  const [hour = "00", minute = "00", second = "00"] = value.split(":")
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`
}

export const AttendanceUpdateSchema = z
  .object({
    time_in: z.string().min(1, { message: "Time in is required" }),
    time_out: z.string(),
    notes: z
      .string()
      .trim()
      .max(200, { message: "Notes must be at most 200 characters" }),
  })
  .superRefine((data, ctx) => {
    if (!data.time_out || !data.time_in) return
    if (clockOrder(data.time_out) <= clockOrder(data.time_in)) {
      ctx.addIssue({
        code: "custom",
        message: "Time out must be after time in",
        path: ["time_out"],
      })
    }
  })

export type AttendanceUpdateInput = z.infer<typeof AttendanceUpdateSchema>
