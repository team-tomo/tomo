import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  Cancel01Icon,
  GoogleGeminiIcon,
} from "@hugeicons/core-free-icons"
import { useLatestConversation } from "@/hooks/use-chat"
import { UnauthenticatedError } from "@/lib/api"
import { sendChatMessage, type ChatMessage } from "@/services/chat-service"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/toast"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@workspace/ui/components/message"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"

const PANEL_TRANSITION = "duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]"

type TokiChatContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  messages: ChatMessage[]
  isSending: boolean
  isLoadingHistory: boolean
  sendMessage: (text: string) => Promise<void>
  startNewConversation: () => void
}

const TokiChatContext = createContext<TokiChatContextValue | null>(null)

function useTokiChat() {
  const context = useContext(TokiChatContext)

  if (!context) {
    throw new Error("Toki chat must be used within TokiChat.")
  }

  return context
}

export function TokiChat({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState<boolean>(false)
  const conversationIdRef = useRef<string | null>(null)
  const isSendingRef = useRef<boolean>(false)
  const hasHydratedRef = useRef<boolean>(false)
  const didToastHistoryErrorRef = useRef<boolean>(false)

  const history = useLatestConversation(open)

  useEffect(() => {
    if (hasHydratedRef.current || !history.isFetched || history.isError) {
      return
    }

    hasHydratedRef.current = true

    if (!history.data) {
      return
    }

    conversationIdRef.current = history.data.id
    setMessages(history.data.messages)
  }, [history.data, history.isFetched, history.isError])

  useEffect(() => {
    if (!history.isError || didToastHistoryErrorRef.current) {
      return
    }
    if (history.error instanceof UnauthenticatedError) {
      return
    }

    didToastHistoryErrorRef.current = true
    toast.add({
      description:
        history.error instanceof Error
          ? history.error.message
          : "Failed to load conversation",
      type: "error",
    })
  }, [history.isError, history.error])

  const startNewConversation = useCallback(() => {
    hasHydratedRef.current = true
    conversationIdRef.current = null
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (isSendingRef.current) {
      return
    }

    hasHydratedRef.current = true
    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()
    isSendingRef.current = true

    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text },
      { id: assistantMessageId, role: "assistant", text: "" },
    ])
    setIsSending(true)

    try {
      await sendChatMessage(conversationIdRef.current, text, (event) => {
        if (event.type === "conversation") {
          conversationIdRef.current = event.id
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
      })
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
    }
  }, [])

  return (
    <TokiChatContext.Provider
      value={{
        open,
        setOpen,
        messages,
        isSending,
        isLoadingHistory: history.isLoading,
        sendMessage,
        startNewConversation,
      }}
    >
      {children}
    </TokiChatContext.Provider>
  )
}

export function TokiChatTrigger() {
  const { open, setOpen } = useTokiChat()

  return (
    <Button
      type="button"
      aria-expanded={open}
      aria-controls="toki-chat-panel"
      onClick={() => setOpen(!open)}
    >
      {open ? "Close conversation" : "Chat with Toki"}
      <HugeiconsIcon
        icon={open ? Cancel01Icon : GoogleGeminiIcon}
        data-icon="inline-end"
      />
    </Button>
  )
}

export function TokiChatPanel() {
  const { open, messages, isSending, startNewConversation } = useTokiChat()
  const canStartNew: boolean = messages.length > 0 && !isSending

  return (
    <aside
      id="toki-chat-panel"
      aria-label="Toki"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "flex h-full min-h-0 shrink-0 overflow-hidden bg-popover transition-[width]",
        PANEL_TRANSITION,
        open ? "w-100 border-l" : "w-0"
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 w-100 flex-col overflow-hidden transition-transform",
          PANEL_TRANSITION,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-sm font-medium text-foreground">
              Toki - Your personal assistant
            </h2>
            <p className="text-xs/relaxed text-balance text-muted-foreground">
              Ask about timesheet, attendance, leaves, and actuals.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New conversation"
            disabled={!canStartNew}
            onClick={startNewConversation}
          >
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <TokiChatThread />
        </div>
        <TokiChatComposer />
      </div>
    </aside>
  )
}

function TokiChatThread() {
  const { messages, isLoadingHistory } = useTokiChat()

  if (isLoadingHistory && messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Loading conversation…</p>
      </div>
    )
  }

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="p-4 [scroll-fade-size:2.5rem]">
          <MessageScrollerContent className="gap-4">
            {messages.map((message) => {
              const isUser = message.role === "user"

              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={isUser}
                >
                  <Message align={isUser ? "end" : "start"}>
                    <MessageAvatar>
                      <Avatar size="sm">
                        <AvatarFallback>{isUser ? "Y" : "T"}</AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <Bubble
                        variant={isUser ? "default" : "muted"}
                        align={isUser ? "end" : "start"}
                      >
                        <BubbleContent>{message.text || "…"}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton size="sm" className="rounded-full">
          Scroll to bottom
          <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

function TokiChatComposer() {
  const { open, isSending, sendMessage } = useTokiChat()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    textareaRef.current?.focus()
  }, [open])

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = new FormData(event.currentTarget)
      .get("message")
      ?.toString()
      .trim()
    if (!text || isSending) {
      return
    }

    event.currentTarget.reset()
    await sendMessage(text)
    textareaRef.current?.focus()
  }

  return (
    <form className="shrink-0 p-4" onSubmit={onSubmit}>
      <Field>
        <FieldLabel htmlFor="toki-message" className="sr-only">
          Message Toki
        </FieldLabel>
        <InputGroup className="min-h-10 items-end">
          <InputGroupTextarea
            ref={textareaRef}
            id="toki-message"
            name="message"
            placeholder="What can we help you with?"
            autoComplete="off"
            rows={1}
            disabled={isSending}
            className="max-h-[calc(4lh+1.25rem)] min-h-10 overflow-y-auto px-3 py-2.5 text-xs/relaxed md:text-xs/relaxed"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-xs"
              aria-label="Send message"
              disabled={isSending}
              className="rounded-full"
            >
              <HugeiconsIcon icon={ArrowUp02Icon} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  )
}
