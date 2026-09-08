import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/attendance")({
  component: TimesheetAttendancePage,
})

function TimesheetAttendancePage() {
  return <div>Hello "/_features/timesheet/attendance"!</div>
}
