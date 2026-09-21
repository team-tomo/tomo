import { HugeiconsIcon } from "@hugeicons/react"
import { AiBrain01Icon, ToolsIcon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import type { ChatStatus, ChatStatusKind } from "@/services/chat-service"

const STATUS_ICON: Record<ChatStatusKind, typeof AiBrain01Icon | null> = {
  thinking: AiBrain01Icon,
  tool: ToolsIcon,
  agent: null,
}

const STATUS_ENTER =
  "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none"

export function ChatStatusLine({ status }: { status: ChatStatus }) {
  const icon = STATUS_ICON[status.kind]

  return (
    <span
      role="status"
      aria-live="polite"
      className="flex animate-pulse overflow-hidden text-xs text-muted-foreground motion-reduce:animate-none"
    >
      <span
        key={status.text}
        className={cn("flex items-center gap-1.5", STATUS_ENTER)}
      >
        {icon ? (
          <HugeiconsIcon
            icon={icon}
            className="size-3.5 shrink-0"
            aria-hidden
          />
        ) : null}
        {status.text}
      </span>
    </span>
  )
}
