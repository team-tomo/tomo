import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/agents/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/agents/"!</div>
}
