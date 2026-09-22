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
      id?: string
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

export type LeaveDraftStatus = "pending" | "filed" | "cancelled"

export type LeaveDraft = {
  id?: string
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

type ChatMessageResponse = {
  id: string
  role: "user" | "assistant"
  text: string
  leave_drafts?: Array<{
    id?: string | null
    date: string
    leave_type: LeaveType
    coverage: LeaveCoverage
    reason: string
    status?: LeaveDraftStatus
  }>
}

type ChatConversationResponse = {
  id: string
  messages: ChatMessageResponse[]
  updated_at: string
}

/** Map one API message onto the chat bubble, including its leave cards. */
function toChatMessage(message: ChatMessageResponse): ChatMessage {
  const leaveDrafts = (message.leave_drafts ?? []).map((draft): LeaveDraft => ({
    ...(draft.id ? { id: draft.id } : {}),
    date: draft.date,
    leave_type: draft.leave_type,
    coverage: draft.coverage,
    reason: draft.reason,
    status: draft.status ?? "pending",
  }))

  return {
    id: message.id,
    role: message.role,
    text: message.text,
    ...(leaveDrafts.length > 0 ? { leaveDrafts } : {}),
  }
}

/** Map a loaded conversation so its leave cards use the client's field names. */
function toConversation(body: ChatConversationResponse): ChatConversation {
  return {
    id: body.id,
    updated_at: body.updated_at,
    messages: body.messages.map(toChatMessage),
  }
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

  const body = (await res.json()) as ChatConversationResponse | null
  return body ? toConversation(body) : null
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

  return toConversation((await res.json()) as ChatConversationResponse)
}

/** Remember that this conversation's leave card was filed or cancelled. */
export async function updateLeaveDraftStatus(
  conversationId: string,
  draftId: string,
  status: "filed" | "cancelled"
) {
  const res = await apiFetch(`/chat/${conversationId}/leave-drafts`, {
    method: "PATCH",
    body: JSON.stringify({ id: draftId, status }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Failed to update leave draft (${res.status})`
    )
  }
}
