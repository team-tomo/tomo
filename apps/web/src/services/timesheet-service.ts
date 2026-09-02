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

export async function getTodayAttendanceStatus(): Promise<TodayAttendanceStatus> {
  const res = await apiFetch("/attendance/today-status")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to fetch attendance status (${res.status})`
    )
  }

  return res.json()
}

export async function clockIn(): Promise<ClockInResponse> {
  const res = await apiFetch("/attendance/clock-in", {
    method: "POST",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to clock in (${res.status})`)
  }

  return res.json()
}

export async function clockOut(notes: string): Promise<ClockOutResponse> {
  const res = await apiFetch("/attendance/clock-out", {
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
