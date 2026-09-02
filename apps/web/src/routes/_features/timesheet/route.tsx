import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div> </div>
}
