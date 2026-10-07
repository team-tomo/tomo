import { createFileRoute } from "@tanstack/react-router"
import { AgentsChat } from "@/components/chat/agents-chat"

export const Route = createFileRoute("/_features/agents/$conversationId")({
  component: RouteComponent,
})

function RouteComponent() {
  const { conversationId } = Route.useParams()

  return <AgentsChat conversationId={conversationId} />
}
