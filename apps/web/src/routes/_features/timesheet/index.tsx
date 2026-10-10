import { createFileRoute } from "@tanstack/react-router"
import { AttendanceHeatmap } from "@/routes/_features/timesheet/attendance-heatmap"

export const Route = createFileRoute("/_features/timesheet/")({
  component: TimesheetPage,
})

function TimesheetPage() {
  return (
    <div className="p-4">
      <AttendanceHeatmap />
    </div>
  )
}
