import { createFileRoute } from "@tanstack/react-router"
import { AttendanceHeatmap } from "@/routes/_features/timesheet/attendance-heatmap"
import { AttendanceHistory } from "@/routes/_features/timesheet/attendance-history"
import { TeamAttendanceLog } from "@/routes/_features/timesheet/team-attendance-log"

export const Route = createFileRoute("/_features/timesheet/")({
  component: TimesheetPage,
})

function TimesheetPage() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-auto px-4 py-6">
        <AttendanceHeatmap />
        <AttendanceHistory />
      </div>
      <TeamAttendanceLog />
    </div>
  )
}
