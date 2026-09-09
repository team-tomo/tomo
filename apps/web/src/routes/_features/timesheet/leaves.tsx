import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/timesheet/leaves")({
  component: TimesheetLeavesPage,
})

function TimesheetLeavesPage() {
  return (
    <div>
      Hello "/_features/timesheet/leaves"!{" "}
      <Link
        to="/timesheet/leaves/$id"
        params={{ id: "vacation-leave-09-23-2026" }}
      >
        Open sample leave
      </Link>
    </div>
  )
}
