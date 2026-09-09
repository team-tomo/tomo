import { createContext, useContext, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp02Icon,
  Cancel01Icon,
  GoogleGeminiIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"

const PANEL_TRANSITION = "duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]"

type TokiChatContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
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
  const [open, setOpen] = useState(false)

  return (
    <TokiChatContext.Provider value={{ open, setOpen }}>
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
  const { open } = useTokiChat()

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
        <div className="flex shrink-0 flex-col gap-1 p-4">
          <h2 className="font-heading text-sm font-medium text-foreground">
            Toki - Timekeeping Assistant
          </h2>
          <p className="text-xs/relaxed text-balance text-muted-foreground">
            Ask about your timesheet, attendance, leaves, or actuals.
          </p>
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
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="p-4 [scroll-fade-size:2.5rem]">
          <MessageScrollerContent className="gap-4" />
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
  return (
    <form className="shrink-0 p-4" onSubmit={(event) => event.preventDefault()}>
      <Field>
        <FieldLabel htmlFor="toki-message" className="sr-only">
          Message Toki
        </FieldLabel>
        <InputGroup className="h-10">
          <InputGroupInput
            id="toki-message"
            name="message"
            placeholder="What can we help you with?"
            autoComplete="off"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-xs"
              aria-label="Send message"
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
