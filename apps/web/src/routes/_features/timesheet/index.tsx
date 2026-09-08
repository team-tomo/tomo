import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/")({
  component: TimesheetOverviewPage,
})

function TimesheetOverviewPage() {
  return <div>Timesheet Overview</div>
}
