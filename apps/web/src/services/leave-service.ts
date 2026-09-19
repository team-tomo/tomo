import { apiFetch } from "@/lib/api"

export type LeaveType = "vl" | "sl" | "el" | "ml" | "pl"
export type LeaveCoverage = "whole" | "half"

export type FileLeavePayload = {
  date: string
  leave_type: LeaveType
  coverage: LeaveCoverage
  reason: string
}

function errorDetail(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("detail" in body)) {
    return fallback
  }
  const detail = (body as { detail: unknown }).detail
  if (typeof detail === "string") {
    return detail
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : null
      )
      .filter((item): item is string => Boolean(item))
    if (messages.length > 0) {
      return messages.join(" ")
    }
  }
  return fallback
}

export async function fileLeave(payload: FileLeavePayload): Promise<void> {
  const res = await apiFetch("/leave", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(errorDetail(body, `Failed to file leave (${res.status})`))
  }
}
