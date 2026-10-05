import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/directory/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/directory/"!</div>
}
