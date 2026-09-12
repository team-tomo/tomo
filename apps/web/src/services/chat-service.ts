import { apiFetch } from "@/lib/api"

export type ChatEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; delta: string }
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

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
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
