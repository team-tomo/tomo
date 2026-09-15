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
import { useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  BookOpenIcon,
  Cancel01Icon,
  GoogleGeminiIcon,
  HistoryIcon,
} from "@hugeicons/core-free-icons"
import {
  chatKeys,
  useConversations,
  useLatestConversation,
} from "@/hooks/use-chat"
import { UnauthenticatedError } from "@/lib/api"
import {
  getConversation,
  sendChatMessage,
  type ChatMessage,
} from "@/services/chat-service"
import { cn } from "@workspace/ui/lib/utils"
import { Markdown } from "@/components/markdown"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/toast"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Message, MessageContent } from "@workspace/ui/components/message"
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
const EMPTY_ENTER =
  "animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-300 ease-out motion-reduce:animate-none"
const SUGGESTIONS = [
  "Can you draft my weekly actuals?",
  "Can you get my attendance last week?",
] as const

type TokiChatContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  messages: ChatMessage[]
  isSending: boolean
  isLoadingHistory: boolean
  activeConversationId: string | null
  sendMessage: (text: string) => Promise<void>
  startNewConversation: () => void
  selectConversation: (conversationId: string) => Promise<void>
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
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<boolean>(false)
  const [draftMessages, setDraftMessages] = useState<ChatMessage[] | null>(null)
  const [sessionConversationId, setSessionConversationId] = useState<
    string | null | undefined
  >(undefined)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const isSendingRef = useRef<boolean>(false)
  const didToastHistoryErrorRef = useRef<boolean>(false)

  const history = useLatestConversation(open)
  const messages: ChatMessage[] = draftMessages ?? history.data?.messages ?? []
  const activeConversationId: string | null =
    sessionConversationId !== undefined
      ? sessionConversationId
      : (history.data?.id ?? null)

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
    setSessionConversationId(null)
    setDraftMessages([])
  }, [])

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (isSendingRef.current || conversationId === activeConversationId) {
        return
      }

      setIsSelecting(true)

      try {
        const conversation = await getConversation(conversationId)
        setSessionConversationId(conversation.id)
        setDraftMessages(conversation.messages)
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

  const sendMessage = useCallback(
    async (text: string) => {
      if (isSendingRef.current) {
        return
      }

      const conversationId: string | null =
        sessionConversationId !== undefined
          ? sessionConversationId
          : (history.data?.id ?? null)
      const userMessageId = crypto.randomUUID()
      const assistantMessageId = crypto.randomUUID()
      isSendingRef.current = true

      setDraftMessages((current) => [
        ...(current ?? history.data?.messages ?? []),
        { id: userMessageId, role: "user", text },
        { id: assistantMessageId, role: "assistant", text: "" },
      ])
      setIsSending(true)

      try {
        await sendChatMessage(conversationId, text, (event) => {
          if (event.type === "conversation") {
            setSessionConversationId(event.id)
          }
          if (event.type === "text") {
            setDraftMessages((current) =>
              (current ?? []).map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: message.text + event.delta }
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
        setDraftMessages((current) =>
          (current ?? []).map((message) =>
            message.id === assistantMessageId && !message.text
              ? { ...message, text: "Something went wrong. Please try again." }
              : message
          )
        )
      } finally {
        isSendingRef.current = false
        setIsSending(false)
      }
    },
    [history.data, queryClient, sessionConversationId]
  )

  return (
    <TokiChatContext.Provider
      value={{
        open,
        setOpen,
        messages,
        isSending,
        isLoadingHistory:
          (history.isLoading && draftMessages === null) || isSelecting,
        activeConversationId,
        sendMessage,
        startNewConversation,
        selectConversation,
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
  const { open, messages, isSending, isLoadingHistory, startNewConversation } =
    useTokiChat()
  const canStartNew: boolean =
    messages.length > 0 && !isSending && !isLoadingHistory

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
        <div className="flex shrink-0 flex-col gap-3 p-4">
          <h2 className="font-heading text-sm font-medium text-foreground">
            Toki - Your personal assistant
          </h2>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <TokiChatHistoryMenu />
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!canStartNew}
                onClick={startNewConversation}
              >
                <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
                New conversation
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-border"
            >
              <HugeiconsIcon icon={BookOpenIcon} data-icon="inline-start" />
              Toki Guide
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <TokiChatThread />
        </div>
        <TokiChatComposer />
      </div>
    </aside>
  )
}

function formatConversationTime(updatedAt: string): string {
  const deltaMs = Date.now() - new Date(updatedAt).getTime()
  const minutes = Math.max(1, Math.floor(deltaMs / 60_000))
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }

  return `${Math.floor(hours / 24)}d`
}

function TokiChatHistoryMenu() {
  const {
    open,
    isSending,
    isLoadingHistory,
    activeConversationId,
    selectConversation,
  } = useTokiChat()
  const conversations = useConversations(open)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isSending || isLoadingHistory}
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Conversation history"
          />
        }
      >
        <HugeiconsIcon icon={HistoryIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 min-w-72">
        <DropdownMenuGroup className="flex flex-col gap-px">
          <DropdownMenuLabel>Recent conversations</DropdownMenuLabel>
          {conversations.isLoading ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Loading…
            </p>
          ) : null}
          {conversations.isError ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Could not load conversations
            </p>
          ) : null}
          {!conversations.isLoading &&
          !conversations.isError &&
          (conversations.data?.length ?? 0) === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No conversations yet
            </p>
          ) : null}
          {conversations.data?.map((conversation) => {
            const isActive = conversation.id === activeConversationId

            return (
              <DropdownMenuItem
                key={conversation.id}
                className={cn(isActive && "bg-accent")}
                onClick={() => {
                  void selectConversation(conversation.id)
                }}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span className="truncate">{conversation.title}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatConversationTime(conversation.updated_at)}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TokiChatEmpty() {
  const { isSending, sendMessage } = useTokiChat()

  return (
    <Empty className="min-h-0 flex-1 border-0">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className={cn("size-6 rounded-lg", EMPTY_ENTER)}
        >
          <HugeiconsIcon
            icon={GoogleGeminiIcon}
            strokeWidth={2}
            className="size-4"
          />
        </EmptyMedia>
        <EmptyTitle className={cn(EMPTY_ENTER, "delay-100")}>
          Ask Toki
        </EmptyTitle>
        <EmptyDescription className={cn(EMPTY_ENTER, "delay-200")}>
          Ask me anything that you need help with.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent
        className={cn(
          EMPTY_ENTER,
          "flex-row flex-wrap justify-center delay-300"
        )}
      >
        {SUGGESTIONS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            disabled={isSending}
            className="max-w-full text-left"
            onClick={() => {
              void sendMessage(prompt)
            }}
          >
            {prompt}
          </Button>
        ))}
      </EmptyContent>
    </Empty>
  )
}

function TokiChatThreadSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col gap-4 p-4"
    >
      <span className="sr-only">Loading conversation</span>
      <Skeleton className="h-8 w-3/4 self-start rounded-lg" />
      <Skeleton className="h-12 w-2/3 self-end rounded-lg" />
      <Skeleton className="h-16 w-4/5 self-start rounded-lg" />
      <Skeleton className="h-8 w-1/2 self-end rounded-lg" />
    </div>
  )
}

function TokiChatThread() {
  const { messages, isLoadingHistory, isSending } = useTokiChat()

  if (isLoadingHistory) {
    return <TokiChatThreadSkeleton />
  }

  if (messages.length === 0) {
    return <TokiChatEmpty />
  }

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="p-4 [scroll-fade-size:2.5rem]">
          <MessageScrollerContent className="gap-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user"
              const isStreaming =
                isSending && !isUser && index === messages.length - 1

              return (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align={isUser ? "end" : "start"}>
                    <MessageContent>
                      <Bubble
                        variant={isUser ? "default" : "muted"}
                        align={isUser ? "end" : "start"}
                      >
                        <BubbleContent
                          className={isUser ? "whitespace-pre-wrap" : undefined}
                        >
                          {!message.text ? (
                            <span className="shimmer text-xs text-muted-foreground">
                              Loading…
                            </span>
                          ) : isUser ? (
                            message.text
                          ) : (
                            <Markdown isAnimating={isStreaming}>
                              {message.text}
                            </Markdown>
                          )}
                        </BubbleContent>
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
  const { open, isSending, isLoadingHistory, sendMessage } = useTokiChat()
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
    if (!text || isSending || isLoadingHistory) {
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
            disabled={isSending || isLoadingHistory}
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
              disabled={isSending || isLoadingHistory}
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
