import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/analytics/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/analytics/"!</div>
}
