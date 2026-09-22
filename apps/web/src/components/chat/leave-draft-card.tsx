import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import type { LeaveDraft } from "@/services/chat-service"

const LEAVE_TYPE_LABEL: Record<LeaveDraft["leave_type"], string> = {
  vl: "Vacation Leave",
  sl: "Sick Leave",
  el: "Emergency Leave",
  ml: "Maternity Leave",
  pl: "Paternity Leave",
}

function formatLeaveDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) {
    return isoDate
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function sentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function LeaveDraftCard({
  draft,
  onConfirm,
  onDismiss,
}: {
  draft: LeaveDraft
  onConfirm: () => void
  onDismiss: () => void
}) {
  const isPending = draft.status === "pending"
  const coverageLabel = draft.coverage === "half" ? "Half Day" : "Whole Day"

  return (
    <div className="w-full min-w-0 p-px">
      <Card
        size="sm"
        className="w-full overflow-visible border border-border ring-0"
      >
        <CardHeader>
          <CardTitle>Leave Request</CardTitle>
          <CardDescription>
            {draft.status === "filed"
              ? "Your leave has been filed."
              : draft.status === "cancelled"
                ? "Your leave draft was cancelled."
                : "Confirm to officially file your leave"}
          </CardDescription>
          <CardAction>
            <Badge
              variant={
                draft.status === "cancelled" ? "destructive" : "secondary"
              }
              className={
                draft.status === "pending"
                  ? "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400"
                  : draft.status === "filed"
                    ? "border-transparent bg-green-500/15 text-green-800 dark:text-green-400"
                    : undefined
              }
            >
              {draft.status === "filed"
                ? "Filed"
                : draft.status === "cancelled"
                  ? "Cancelled"
                  : "Draft"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="tabular-nums">{formatLeaveDate(draft.date)}</span>
            <span className="text-muted-foreground" aria-hidden>
              |
            </span>
            <span>{LEAVE_TYPE_LABEL[draft.leave_type]}</span>
            <span className="text-muted-foreground" aria-hidden>
              |
            </span>
            <span>{coverageLabel}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Reason: </span>
            {sentenceCase(draft.reason)}
          </p>
          {draft.error ? (
            <p className="text-destructive">{draft.error}</p>
          ) : null}
        </CardContent>
        {isPending ? (
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={draft.isFiling}
              onClick={onDismiss}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={draft.isFiling}
              onClick={onConfirm}
            >
              {draft.isFiling ? "Submitting…" : "Submit"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
