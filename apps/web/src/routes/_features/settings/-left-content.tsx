import { useCurrentUser } from "@/hooks/use-current-user"
import { getInitials } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Progress } from "@workspace/ui/components/progress"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Info } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

const AGENT_USAGE_LIMIT = 50
const AGENT_USAGE_USED = 33

const ROLE_LABELS: Record<string, string> = {
  dev: "Dev",
  executive: "Executive",
  support: "Support",
  lead: "Lead",
  ic: "IC",
}

export function LeftContent() {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 pt-4">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Avatar className="size-24">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-primary text-4xl text-primary-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {user.role ? (
          <Badge variant="secondary" className="gap-1">
            {ROLE_LABELS[user.role] ?? user.role} Role
          </Badge>
        ) : null}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1 text-xs">
            Agent triggered usage limits
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex"
                    aria-label="About agent usage limits"
                  />
                }
              >
                <HugeiconsIcon
                  icon={Info}
                  className="size-3 text-muted-foreground"
                />
              </TooltipTrigger>
              <TooltipContent>
                50 agent runs per month, resets monthly.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-0">
          <Progress
            value={AGENT_USAGE_USED}
            max={AGENT_USAGE_LIMIT}
            className="mb-0 w-full text-primary"
          />
        </CardContent>
      </Card>
    </div>
  )
}
