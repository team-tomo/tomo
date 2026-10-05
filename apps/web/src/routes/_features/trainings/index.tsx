import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/trainings/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_features/trainings/"!</div>
}
