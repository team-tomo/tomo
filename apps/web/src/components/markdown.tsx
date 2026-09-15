import { Streamdown } from "streamdown"
import "streamdown/styles.css"
import { cn } from "@workspace/ui/lib/utils"

export function Markdown({
  children,
  className,
  isAnimating = false,
}: {
  children: string
  className?: string
  isAnimating?: boolean
}) {
  return (
    <div className={cn("typeset typeset-chat", className)}>
      <Streamdown
        animated={isAnimating}
        className="space-y-1.5"
        isAnimating={isAnimating}
      >
        {children}
      </Streamdown>
    </div>
  )
}
