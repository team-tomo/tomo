import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/accounts")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/accounts"!</div>
}
