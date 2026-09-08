import { createContext, useContext, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, GoogleGeminiIcon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

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
      {open ? "Finish conversation" : "Chat with Toki"}
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
        "flex shrink-0 overflow-hidden bg-popover transition-[width]",
        PANEL_TRANSITION,
        open ? "w-96 border-l" : "w-0"
      )}
    >
      <div
        className={cn(
          "flex h-full w-96 flex-col transition-transform",
          PANEL_TRANSITION,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 flex-col gap-1 p-4">
          <h2 className="font-heading text-sm font-medium text-foreground">
            Toki
          </h2>
          <p className="text-xs/relaxed text-balance text-muted-foreground">
            Ask about your timesheet, attendance, leaves, or actuals.
          </p>
        </div>
        <div className="flex-1 p-4" />
      </div>
    </aside>
  )
}
