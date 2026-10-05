import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/engagements/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/engagements/"!</div>
}
