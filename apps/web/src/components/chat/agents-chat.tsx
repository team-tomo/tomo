import { useEffect, useRef, useState, type SubmitEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAgentName } from "@/routes/_features/agents/route"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ChatGptIcon,
  ClaudeIcon,
  GoogleGeminiIcon,
  RefreshIcon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import {
  conversationAge,
  greeting,
  phase,
  WELCOME_HISTORY_LIMIT,
} from "@/routes/_features/agents/-chat"
import { cn } from "@workspace/ui/lib/utils"
import { useConversations } from "@/hooks/use-chat"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Markdown } from "@/components/markdown"
import { ChatStatusLine } from "@/components/chat/chat-status"
import { LeaveDraftCard } from "@/components/chat/leave-draft-card"
import { useMomoChat } from "@/components/chat/momo-chat"
import type { ChatStatus } from "@/services/chat-service"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Field, FieldLabel } from "@workspace/ui/components/field"
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

const FIRST_STATUS: ChatStatus = { text: "Thinking", kind: "thinking" }

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini", icon: ChatGptIcon },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini", icon: ChatGptIcon },
  { value: "gpt-4o", label: "GPT-4o", icon: ChatGptIcon },
  { value: "gpt-4.1", label: "GPT-4.1", icon: ChatGptIcon },
  { value: "o3-mini", label: "o3-mini", icon: ChatGptIcon },
  { value: "claude-sonnet", label: "Claude Sonnet", icon: ClaudeIcon },
  { value: "gemini-flash", label: "Gemini Flash", icon: GoogleGeminiIcon },
] as const

type ModelOption = (typeof MODEL_OPTIONS)[number]["value"]

const SUGGESTIONS = [
  "Draft my weekly actuals",
  "Get my attendance",
  "Generate a report on my sales performance",
] as const

export function AgentsChat({
  conversationId,
}: {
  conversationId: string | null
}) {
  const {
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
  } = useMomoChat()
  const { data: user } = useCurrentUser()
  const agentName = useAgentName()
  useEffect(() => {
    if (conversationId === null) {
      if (activeConversationId !== null && !isSending) {
        startNewConversation()
      }
      return
    }
    if (isSending || conversationId === activeConversationId) {
      return
    }
    void selectConversation(conversationId)
  }, [
    conversationId,
    activeConversationId,
    isSending,
    selectConversation,
    startNewConversation,
  ])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {phase(conversationId) === "welcome" || conversationId === null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                {greeting({
                  name: user?.name ?? "",
                  hour: new Date().getHours(),
                })}
              </h1>
              <p className="text-sm text-muted-foreground">
                I'm {agentName}, where should we start today?
              </p>
              <AgentsComposer variant="welcome" />
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSending || isSelecting}
                    className="max-w-full text-left"
                    onClick={() => {
                      void sendMessage(prompt)
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <PreviousChats />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ConversationRail activeId={conversationId} />
          <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="min-h-0 flex-1">
                <MessageScrollerViewport className="p-4 [scroll-fade-size:2.5rem]">
                  <MessageScrollerContent className="gap-4">
                    {messages.length === 0 && isSelecting ? (
                      <p className="text-xs text-muted-foreground">
                        Loading conversation
                      </p>
                    ) : null}
                    {messages.map((message, index) => {
                      const isUser = message.role === "user"
                      const isStreaming =
                        isSending && !isUser && index === messages.length - 1
                      const showBubble = message.text.length > 0 || isStreaming

                      return (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          className={
                            message.leaveDrafts?.length
                              ? "[content-visibility:visible]"
                              : undefined
                          }
                        >
                          <Message align={isUser ? "end" : "start"}>
                            <MessageContent>
                              {showBubble ? (
                                <Bubble
                                  variant={isUser ? "default" : "muted"}
                                  align={isUser ? "end" : "start"}
                                >
                                  <BubbleContent
                                    className={
                                      isUser ? "whitespace-pre-wrap" : undefined
                                    }
                                  >
                                    {!message.text ? (
                                      <ChatStatusLine
                                        status={
                                          isStreaming && status
                                            ? status
                                            : FIRST_STATUS
                                        }
                                      />
                                    ) : isUser ? (
                                      message.text
                                    ) : (
                                      <Markdown isAnimating={isStreaming}>
                                        {message.text}
                                      </Markdown>
                                    )}
                                  </BubbleContent>
                                </Bubble>
                              ) : null}
                              {message.leaveDrafts?.map((draft, draftIndex) => (
                                <LeaveDraftCard
                                  key={`${message.id}-${draft.id ?? draftIndex}-${draft.date}`}
                                  draft={draft}
                                  onConfirm={() => {
                                    void confirmLeaveDraft(
                                      message.id,
                                      draftIndex
                                    )
                                  }}
                                  onDismiss={() => {
                                    void dismissLeaveDraft(
                                      message.id,
                                      draftIndex
                                    )
                                  }}
                                />
                              ))}
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      )
                    })}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton size="sm" className="rounded-full">
                  Scroll to bottom
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    data-icon="inline-end"
                  />
                </MessageScrollerButton>
              </MessageScroller>
            </MessageScrollerProvider>
            <AgentsComposer variant="thread" />
          </div>
        </div>
      )}
    </div>
  )
}

function AgentsComposer({ variant }: { variant: "welcome" | "thread" }) {
  const navigate = useNavigate()
  const { messages, isSending, isSelecting, sendMessage } = useMomoChat()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isWelcome = variant === "welcome"

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const text = new FormData(form).get("message")?.toString() ?? ""
    const sent = await sendMessage(text)
    if (!sent) {
      return
    }

    form.reset()
    textareaRef.current?.focus()
  }

  return (
    <form
      className={
        isWelcome ? "w-full text-left" : "shrink-0 px-4 pt-2 pb-4 text-left"
      }
      onSubmit={onSubmit}
    >
      <Field>
        <FieldLabel htmlFor="momo-message" className="sr-only">
          Message Momo
        </FieldLabel>
        <InputGroup className="min-h-10">
          <InputGroupTextarea
            ref={textareaRef}
            id="momo-message"
            name="message"
            placeholder="What can we help you with?"
            autoComplete="off"
            rows={isWelcome ? 2 : 1}
            disabled={isSending || isSelecting}
            className={
              isWelcome
                ? "max-h-[calc(3lh+1.25rem)] min-h-[calc(2lh+1.25rem)] overflow-y-auto px-3 py-2.5 text-xs/relaxed md:text-xs/relaxed"
                : "max-h-[calc(4lh+1.25rem)] min-h-10 overflow-y-auto px-3 py-2.5 text-xs/relaxed md:text-xs/relaxed"
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-between">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={messages.length === 0 || isSending || isSelecting}
                onClick={() => {
                  void navigate({ to: "/agents" })
                }}
              >
                <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
                New conversation
              </Button>
              <ModelSelect menuSide={isWelcome ? "bottom" : "top"} />
            </div>
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              aria-label="Send message"
              disabled={isSending || isSelecting}
            >
              <HugeiconsIcon icon={SentIcon} data-icon="inline-start" />
              Send
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  )
}

function ModelSelect({ menuSide }: { menuSide: "top" | "bottom" }) {
  const [model, setModel] = useState<ModelOption>(MODEL_OPTIONS[0].value)
  const selected =
    MODEL_OPTIONS.find((option) => option.value === model) ?? MODEL_OPTIONS[0]

  return (
    <Select
      value={model}
      onValueChange={(value) => {
        const match = MODEL_OPTIONS.find((option) => option.value === value)
        if (match) {
          setModel(match.value)
        }
      }}
    >
      <SelectTrigger type="button" size="sm" aria-label="Model">
        <HugeiconsIcon icon={selected.icon} className="size-3.5 shrink-0" />
        <SelectValue>{selected.label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" side={menuSide} className="p-1">
        <SelectGroup className="flex flex-col gap-px p-0">
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={option.icon}
                  className="size-3.5 shrink-0"
                />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const PREVIEW_COUNT = 5
const PREVIOUS_CHAT_CARD =
  "flex min-h-21 flex-col items-start gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"

function PreviousChats() {
  const navigate = useNavigate()
  const { isSelecting } = useMomoChat()
  const conversations = useConversations(true, WELCOME_HISTORY_LIMIT)
  const [expanded, setExpanded] = useState(false)
  const items = conversations.data ?? []
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT)

  if (
    !conversations.isLoading &&
    !conversations.isError &&
    items.length === 0
  ) {
    return null
  }

  return (
    <section
      aria-busy={conversations.isLoading}
      className="flex max-h-[45%] w-full shrink-0 flex-col gap-4 overflow-y-auto px-6 pt-2 pb-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">
          {conversations.isLoading
            ? "Previous chats"
            : `Previous chats (${items.length})`}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={conversations.isFetching}
            onClick={() => {
              void conversations.refetch()
            }}
          >
            <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
            Refresh
          </Button>
          {items.length > PREVIEW_COUNT ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setExpanded((current) => !current)
              }}
            >
              {expanded ? "Collapse" : "Expand"}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                data-icon="inline-end"
                className={expanded ? "rotate-180" : undefined}
              />
            </Button>
          ) : null}
        </div>
      </div>
      {conversations.isLoading ? (
        <div className="grid w-full grid-cols-5 gap-3" aria-hidden>
          {Array.from({ length: PREVIEW_COUNT }, (_, index) => (
            <div key={index} className={PREVIOUS_CHAT_CARD}>
              <Skeleton className="size-4 rounded-full" />
              <span className="flex w-full flex-col">
                <span className="flex h-4 w-4/5 items-center">
                  <Skeleton className="h-3 w-full" />
                </span>
                <span className="flex h-4 w-3/5 items-center">
                  <Skeleton className="h-3 w-full" />
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {conversations.isError ? (
        <p className="text-xs text-muted-foreground">
          Could not load conversations
        </p>
      ) : null}
      {visible.length > 0 ? (
        <div className="grid w-full grid-cols-5 gap-3">
          {visible.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              disabled={isSelecting}
              className={cn(
                PREVIOUS_CHAT_CARD,
                "text-left hover:bg-muted/50 disabled:opacity-50"
              )}
              onClick={() => {
                void navigate({
                  to: "/agents/$conversationId",
                  params: { conversationId: conversation.id },
                })
              }}
            >
              <span className="size-4 rounded-full bg-primary" />
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {conversation.title}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ConversationRail({ activeId }: { activeId: string }) {
  const navigate = useNavigate()
  const { isSelecting } = useMomoChat()
  const conversations = useConversations(true)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r">
      <h2 className="px-3 pt-3 pb-2 text-sm font-medium">Conversations</h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.isLoading ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Loading conversations
          </p>
        ) : null}
        {conversations.isError ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Could not load conversations
          </p>
        ) : null}
        <div className="flex flex-col gap-0.5">
          {conversations.data?.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              disabled={isSelecting}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted disabled:opacity-50",
                conversation.id === activeId && "bg-accent text-foreground"
              )}
              onClick={() => {
                void navigate({
                  to: "/agents/$conversationId",
                  params: { conversationId: conversation.id },
                })
              }}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full bg-muted-foreground/50",
                  conversation.id === activeId && "bg-foreground"
                )}
              />
              <span className="min-w-0 flex-1 truncate">
                {conversation.title}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {conversationAge(conversation.updated_at, Date.now())}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
