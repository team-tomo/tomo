import { createFileRoute } from "@tanstack/react-router"
import { AttendanceHeatmap } from "@/routes/_features/timesheet/attendance-heatmap"
import { TeamAttendanceLog } from "@/routes/_features/timesheet/team-attendance-log"

export const Route = createFileRoute("/_features/timesheet/")({
  component: TimesheetPage,
})

function TimesheetPage() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-auto px-4 py-6">
        <AttendanceHeatmap />
      </div>
      <TeamAttendanceLog />
    </div>
  )
}
