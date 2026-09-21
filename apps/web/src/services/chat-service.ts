import { apiFetch } from "@/lib/api"

import type { LeaveCoverage, LeaveType } from "@/services/leave-service"

export type ChatStatusKind = "thinking" | "tool" | "agent"

export type ChatStatus = {
  text: string
  kind: ChatStatusKind
}

export type ChatEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; delta: string }
  | { type: "status"; text: string | null; kind?: ChatStatusKind }
  | {
      type: "leave_draft"
      date: string
      leave_type: LeaveType
      coverage: LeaveCoverage
      reason: string
    }
  | { type: "done" }
  | { type: "error"; detail: string }

function parseSseLine(line: string): ChatEvent | null {
  const payload = line.trim()
  if (!payload.startsWith("data:")) {
    return null
  }

  const json = payload.slice(5).trim()
  if (!json) {
    return null
  }

  return JSON.parse(json) as ChatEvent
}

export async function sendChatMessage(
  conversationId: string | null,
  message: string,
  onEvent: (event: ChatEvent) => void
) {
  const res = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
    }),
  })

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Failed to send message (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const emit = (chunk: string) => {
    for (const line of chunk.split("\n")) {
      const event = parseSseLine(line)
      if (!event) {
        continue
      }
      if (event.type === "error") {
        throw new Error(event.detail)
      }
      onEvent(event)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    emit(lines.join("\n"))
  }

  if (buffer.trim()) {
    emit(buffer)
  }
}

export type LeaveDraftStatus = "pending" | "filed" | "dismissed"

export type LeaveDraft = {
  date: string
  leave_type: LeaveType
  coverage: LeaveCoverage
  reason: string
  status: LeaveDraftStatus
  error?: string
  isFiling?: boolean
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  leaveDrafts?: LeaveDraft[]
}

export type ChatConversation = {
  id: string
  messages: ChatMessage[]
  updated_at: string
}

export async function getLatestConversation(): Promise<ChatConversation | null> {
  const res = await apiFetch("/chat/latest")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to load latest conversation (${res.status})`
    )
  }

  return res.json()
}

export type ChatConversationSummary = {
  id: string
  title: string
  updated_at: string
}

export async function listConversations(): Promise<ChatConversationSummary[]> {
  const res = await apiFetch("/chat")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to load conversations (${res.status})`
    )
  }

  return res.json()
}

export async function getConversation(
  conversationId: string
): Promise<ChatConversation> {
  const res = await apiFetch(`/chat/${conversationId}`)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to load conversation (${res.status})`
    )
  }

  return res.json()
}
