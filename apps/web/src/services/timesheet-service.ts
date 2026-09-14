import { apiFetch } from "@/lib/api"

export type TodayAttendanceStatus = {
  can_clock_in: boolean
  can_clock_out: boolean
}

export type ClockInResponse = {
  id: string
  user_id: string
  time_in: string
  is_late: boolean
  created_at: string
  updated_at: string
}

export type ClockOutResponse = {
  id: string
  user_id: string
  time_in: string
  time_out: string
  is_late: boolean
  created_at: string
  updated_at: string
}

export type AttendanceStatus = "on_time" | "late" | "incomplete"

export type AttendanceSummary = {
  date: string
  status: AttendanceStatus
}

export type AttendanceRecord = {
  id: string
  user_id: string
  date: string
  time_in: string | null
  time_out: string | null
  is_late: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type AttendanceQuery = {
  from_date?: string
  to_date?: string
}

export async function getTodayAttendanceStatus(): Promise<TodayAttendanceStatus> {
  const res = await apiFetch("/timesheet/today-status")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to fetch attendance status (${res.status})`
    )
  }

  return res.json()
}

export async function clockIn(): Promise<ClockInResponse> {
  const res = await apiFetch("/timesheet/clock-in", {
    method: "POST",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to clock in (${res.status})`)
  }

  return res.json()
}

export async function clockOut(notes: string): Promise<ClockOutResponse> {
  const res = await apiFetch("/timesheet/clock-out", {
    method: "PATCH",
    body: JSON.stringify({
      notes: notes,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to clock out (${res.status})`)
  }

  return res.json()
}

export async function listAttendanceSummary(): Promise<AttendanceSummary[]> {
  const res = await apiFetch("/timesheet/attendance/summary")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to fetch attendance summary (${res.status})`
    )
  }

  return res.json()
}

export async function listAttendance(
  query: AttendanceQuery = {}
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams()
  if (query.from_date) params.set("from_date", query.from_date)
  if (query.to_date) params.set("to_date", query.to_date)
  const qs = params.toString()

  const res = await apiFetch(`/timesheet/attendance${qs ? `?${qs}` : ""}`)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to fetch attendance (${res.status})`)
  }

  return res.json()
}
