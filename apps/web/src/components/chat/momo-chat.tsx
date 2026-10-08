import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { shouldSend } from "@/routes/_features/agents/-chat"
import { chatKeys } from "@/hooks/use-chat"
import { UnauthenticatedError } from "@/lib/api"
import {
  getConversation,
  sendChatMessage,
  updateLeaveDraftStatus,
  type ChatMessage,
  type ChatStatus,
  type LeaveDraft,
} from "@/services/chat-service"
import { fileLeave } from "@/services/leave-service"
import { toast } from "@workspace/ui/components/toast"

function patchLeaveDraft(
  messages: ChatMessage[],
  messageId: string,
  index: number,
  patch: (draft: LeaveDraft) => LeaveDraft
): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.leaveDrafts) {
      return message
    }
    return {
      ...message,
      leaveDrafts: message.leaveDrafts.map((draft, draftIndex) =>
        draftIndex === index ? patch(draft) : draft
      ),
    }
  })
}

function filingErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "Request timed out"
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return "Failed to file leave"
}

const FIRST_STATUS: ChatStatus = { text: "Thinking", kind: "thinking" }

type MomoChatContextValue = {
  messages: ChatMessage[]
  activeConversationId: string | null
  status: ChatStatus | null
  isSending: boolean
  isSelecting: boolean
  sendMessage: (text: string) => Promise<boolean>
  startNewConversation: () => void
  selectConversation: (conversationId: string) => Promise<void>
  confirmLeaveDraft: (messageId: string, index: number) => Promise<void>
  dismissLeaveDraft: (messageId: string, index: number) => Promise<void>
}

const MomoChatContext = createContext<MomoChatContextValue | null>(null)

export function useMomoChat() {
  const context = useContext(MomoChatContext)

  if (!context) {
    throw new Error("Momo chat must be used within MomoChat.")
  }

  return context
}

export function MomoChat({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [status, setStatus] = useState<ChatStatus | null>(null)
  const isSendingRef = useRef<boolean>(false)
  const messagesRef = useRef<ChatMessage[]>([])
  const filingKeysRef = useRef(new Set<string>())
  messagesRef.current = messages

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!shouldSend(trimmed) || isSendingRef.current) {
        return false
      }

      const conversationId = activeConversationId
      const startedWithoutConversation = conversationId === null
      const userMessageId = crypto.randomUUID()
      const assistantMessageId = crypto.randomUUID()
      isSendingRef.current = true

      setMessages((current) => [
        ...current,
        { id: userMessageId, role: "user", text: trimmed },
        { id: assistantMessageId, role: "assistant", text: "" },
      ])
      setIsSending(true)
      setStatus(FIRST_STATUS)

      try {
        await sendChatMessage(conversationId, trimmed, (event) => {
          if (event.type === "conversation") {
            setActiveConversationId(event.id)
            if (startedWithoutConversation) {
              void navigate({
                to: "/agents/$conversationId",
                params: { conversationId: event.id },
              })
            }
          }
          if (event.type === "status") {
            setStatus(
              event.text
                ? { text: event.text, kind: event.kind ?? "agent" }
                : null
            )
          }
          if (event.type === "text") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: message.text + event.delta }
                  : message
              )
            )
          }
          if (event.type === "leave_draft") {
            const draft: LeaveDraft = {
              ...(event.id ? { id: event.id } : {}),
              date: event.date,
              leave_type: event.leave_type,
              coverage: event.coverage,
              reason: event.reason,
              status: "pending",
            }
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      leaveDrafts: [...(message.leaveDrafts ?? []), draft],
                    }
                  : message
              )
            )
          }
        })
        await queryClient.invalidateQueries({ queryKey: chatKeys.list() })
      } catch (error) {
        if (!(error instanceof UnauthenticatedError)) {
          toast.add({
            description:
              error instanceof Error ? error.message : "Failed to send message",
            type: "error",
          })
        }
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId && !message.text
              ? { ...message, text: "Something went wrong. Please try again." }
              : message
          )
        )
      } finally {
        isSendingRef.current = false
        setIsSending(false)
        setStatus(null)
      }

      return true
    },
    [activeConversationId, navigate, queryClient]
  )

  const startNewConversation = useCallback(() => {
    if (isSendingRef.current) {
      return
    }
    setActiveConversationId(null)
    setMessages([])
    setStatus(null)
  }, [])

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (isSendingRef.current || conversationId === activeConversationId) {
        return
      }

      setIsSelecting(true)
      try {
        const conversation = await getConversation(conversationId)
        setActiveConversationId(conversation.id)
        setMessages(conversation.messages)
        setStatus(null)
      } catch (error) {
        if (!(error instanceof UnauthenticatedError)) {
          toast.add({
            description:
              error instanceof Error
                ? error.message
                : "Failed to load conversation",
            type: "error",
          })
        }
      } finally {
        setIsSelecting(false)
      }
    },
    [activeConversationId]
  )

  const dismissLeaveDraft = useCallback(
    async (messageId: string, index: number) => {
      const draft = messagesRef.current.find(
        (message) => message.id === messageId
      )?.leaveDrafts?.[index]
      if (!draft || draft.status !== "pending") {
        return
      }

      if (draft.id && activeConversationId) {
        try {
          await updateLeaveDraftStatus(
            activeConversationId,
            draft.id,
            "cancelled"
          )
        } catch (error) {
          if (!(error instanceof UnauthenticatedError)) {
            toast.add({
              description:
                error instanceof Error
                  ? error.message
                  : "Failed to cancel leave draft",
              type: "error",
            })
          }
          return
        }
      }

      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId || !message.leaveDrafts) {
            return message
          }
          return {
            ...message,
            leaveDrafts: message.leaveDrafts.map((item, draftIndex) =>
              draftIndex === index
                ? { ...item, status: "cancelled", error: undefined }
                : item
            ),
          }
        })
      )
    },
    [activeConversationId]
  )

  const confirmLeaveDraft = useCallback(
    async (messageId: string, index: number) => {
      const key = `${messageId}:${index}`
      if (filingKeysRef.current.has(key)) {
        return
      }

      const payload = messagesRef.current.find(
        (message) => message.id === messageId
      )?.leaveDrafts?.[index]
      if (!payload || payload.status !== "pending") {
        return
      }

      filingKeysRef.current.add(key)
      setMessages((current) =>
        patchLeaveDraft(current, messageId, index, (draft) => ({
          ...draft,
          isFiling: true,
          error: undefined,
        }))
      )

      try {
        await fileLeave({
          date: payload.date,
          leave_type: payload.leave_type,
          coverage: payload.coverage,
          reason: payload.reason,
        })
        if (payload.id && activeConversationId) {
          try {
            await updateLeaveDraftStatus(
              activeConversationId,
              payload.id,
              "filed"
            )
          } catch (error) {
            if (!(error instanceof UnauthenticatedError)) {
              toast.add({
                description:
                  error instanceof Error
                    ? error.message
                    : "Leave was filed, but the conversation could not be updated.",
                type: "error",
              })
            }
          }
        }
        setMessages((current) =>
          patchLeaveDraft(current, messageId, index, (draft) => ({
            ...draft,
            status: "filed",
            isFiling: false,
            error: undefined,
          }))
        )
      } catch (error) {
        const detail = filingErrorMessage(error)
        setMessages((current) =>
          patchLeaveDraft(current, messageId, index, (draft) => ({
            ...draft,
            isFiling: false,
            error: error instanceof UnauthenticatedError ? undefined : detail,
          }))
        )
        if (!(error instanceof UnauthenticatedError)) {
          toast.add({ description: detail, type: "error" })
        }
      } finally {
        filingKeysRef.current.delete(key)
      }
    },
    [activeConversationId]
  )

  return (
    <MomoChatContext.Provider
      value={{
        messages,
        activeConversationId,
        status,
        isSending,
        isSelecting,
        sendMessage,
        startNewConversation,
        selectConversation,
        confirmLeaveDraft,
        dismissLeaveDraft,
      }}
    >
      {children}
    </MomoChatContext.Provider>
  )
}
