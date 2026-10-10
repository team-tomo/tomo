import { createContext, useContext, useState } from "react"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, LayersLogoIcon } from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

const AGENTS = [
  { id: "momo", label: "Momo", color: "bg-foreground" },
  { id: "aether", label: "Aether", color: "bg-violet-400" },
  { id: "syntax", label: "Syntax", color: "bg-emerald-400" },
  { id: "theo", label: "Theo", color: "bg-sky-400" },
  { id: "clara", label: "Clara", color: "bg-rose-400" },
] as const

type AgentId = (typeof AGENTS)[number]["id"]

const AgentNameContext = createContext("Momo")

export function useAgentName() {
  return useContext(AgentNameContext)
}

export const Route = createFileRoute("/_features/agents")({
  component: AgentsLayout,
})

function AgentsLayout() {
  const [agent, setAgent] = useState<AgentId>("momo")
  const agentName = AGENTS.find((item) => item.id === agent)?.label ?? "Momo"

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2">
        <Button type="button" variant="outline">
          <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
          Create Agent
        </Button>
        <Button type="button" variant="outline">
          <HugeiconsIcon icon={LayersLogoIcon} data-icon="inline-start" />
          Browse template
        </Button>

        <Separator
          orientation="vertical"
          className="h-4 data-vertical:self-center!"
        />

        {AGENTS.map((item) => {
          const selected = agent === item.id

          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              className={cn(selected && "bg-muted text-foreground")}
              onClick={() => {
                setAgent(item.id)
              }}
            >
              <span className={cn("size-3.5 rounded-full", item.color)} />
              {item.label}
            </Button>
          )
        })}
      </div>
      <AgentNameContext.Provider value={agentName}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </AgentNameContext.Provider>
    </div>
  )
}
