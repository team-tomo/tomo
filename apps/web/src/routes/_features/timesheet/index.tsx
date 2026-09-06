import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/")({
  component: TimesheetPage,
})

function TimesheetPage() {
  return <div> </div>
}
