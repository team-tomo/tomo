import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/actuals")({
  component: TimesheetActualsPage,
})

function TimesheetActualsPage() {
  return <div></div>
}
