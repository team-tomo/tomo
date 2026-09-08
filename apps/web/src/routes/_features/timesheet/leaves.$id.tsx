import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/leaves/$id")({
  component: TimesheetLeaveDetailPage,
})

function TimesheetLeaveDetailPage() {
  const { id } = Route.useParams()

  return <div>Hello "/_features/timesheet/leaves/{id}"!</div>
}
