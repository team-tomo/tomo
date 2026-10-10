import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAttendanceSummary } from "@/hooks/use-timesheet"
import { listLeaveRequests, type LeaveCoverage } from "@/services/leave-service"
import type { AttendanceStatus } from "@/services/timesheet-service"

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const LEVELS = [
  { id: "none", label: "No attendance" },
  { id: "incomplete", label: "Incomplete" },
  { id: "half-leave", label: "Half-day leave" },
  { id: "whole-leave", label: "Whole-day leave" },
  { id: "late", label: "Late" },
  { id: "on-time", label: "On time" },
] as const

type AttendanceLevel = (typeof LEVELS)[number]["id"]

const SWATCH: Record<AttendanceLevel, string> = {
  none: "bg-muted",
  "half-leave": "bg-red-500",
  "whole-leave": "bg-red-500",
  late: "bg-amber-400",
  incomplete: "bg-amber-400",
  "on-time": "bg-chart-1",
}

const LEGEND = [
  { label: "No attendance", className: SWATCH.none },
  { label: "Leave", className: SWATCH["half-leave"] },
  { label: "Late / incomplete", className: SWATCH.late },
  { label: "On time", className: SWATCH["on-time"] },
]

function manilaToday() {
  const iso = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  })
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function levelFor(
  date: string,
  attendance: Map<string, AttendanceStatus>,
  leave: Map<string, LeaveCoverage>
): AttendanceLevel {
  const coverage = leave.get(date)
  if (coverage === "half") return "half-leave"
  if (coverage === "whole") return "whole-leave"
  const status = attendance.get(date)
  if (status === "late") return "late"
  if (status === "on_time") return "on-time"
  if (status === "incomplete") return "incomplete"
  return "none"
}

function weeksForYear(today: Date) {
  const start = new Date(today.getFullYear(), 0, 1)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(today.getFullYear(), 11, 31)
  end.setDate(end.getDate() + (6 - end.getDay()))

  const weeks: Date[][] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)))
  }
  return weeks
}

type DayTip = {
  when: string
  name: string
  swatch: string
}

type DayHover = DayTip & {
  top: number
  left: number
}

function tipFor(
  date: Date,
  todayIso: string,
  yearStart: string,
  yearEnd: string,
  attendance: Map<string, AttendanceStatus>,
  leave: Map<string, LeaveCoverage>
): DayTip | null {
  const key = isoDate(date)
  if (key < yearStart || key > yearEnd) return null
  const when = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  if (key > todayIso && !leave.has(key) && !attendance.has(key)) {
    return { when, name: "Upcoming", swatch: "bg-muted/40" }
  }
  const level = levelFor(key, attendance, leave)
  const name =
    LEVELS.find((item) => item.id === level)?.label ?? "No attendance"
  return { when, name, swatch: SWATCH[level] }
}

function DayTooltip({ hover }: { hover: DayHover | null }) {
  if (!hover) return null
  const below = hover.top < 72
  return createPortal(
    <div
      role="tooltip"
      className={`pointer-events-none fixed z-50 flex -translate-x-1/2 flex-col items-center ${below ? "" : "-translate-y-full"}`}
      style={{ top: below ? hover.top + 16 : hover.top - 6, left: hover.left }}
    >
      {below ? <span className="-mb-1 size-2 rotate-45 bg-foreground" /> : null}
      <div className="rounded-md bg-foreground px-2.5 py-1.5 text-background shadow-md">
        <p className="text-xs leading-none font-medium">{hover.when}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-none">
          <span className={`size-2 rounded-xs ${hover.swatch}`} />
          {hover.name}
        </p>
      </div>
      {below ? null : <span className="-mt-1 size-2 rotate-45 bg-foreground" />}
    </div>,
    document.body
  )
}

function monthLabels(weeks: Date[][], year: number) {
  const labels: string[] = []
  let previous = -3
  weeks.forEach((week, index) => {
    const first = week.find(
      (date) => date.getDate() === 1 && date.getFullYear() === year
    )
    if (!first || index - previous < 2) {
      labels.push("")
      return
    }
    labels.push(MONTHS[first.getMonth()] ?? "")
    previous = index
  })
  return labels
}

function LevelLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {LEGEND.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className={`size-2.5 rounded-xs ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function GraphFrame({
  labels,
  children,
}: {
  labels: string[]
  children: ReactNode
}) {
  return (
    <div className="flex w-max gap-2">
      <div className="flex w-6 flex-col gap-0.75 pt-4">
        {DAY_LABELS.map((label, index) => (
          <span
            key={index}
            className="flex h-2.5 items-center text-[10px] leading-none text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <div>
        <div className="flex h-4 gap-0.75">
          {labels.map((label, index) => (
            <span
              key={index}
              className="w-2.5 text-[10px] leading-none text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-0.75">{children}</div>
      </div>
    </div>
  )
}

function AttendanceHeatmapSkeleton({
  weeks,
  labels,
  yearStart,
  yearEnd,
}: {
  weeks: Date[][]
  labels: string[]
  yearStart: string
  yearEnd: string
}) {
  return (
    <div className="w-fit max-w-full self-start overflow-x-auto">
      <div className="mb-3">
        <GraphFrame labels={labels}>
          {weeks.map((week) => (
            <div key={isoDate(week[0])} className="flex flex-col gap-0.75">
              {week.map((date) => {
                const key = isoDate(date)
                if (key < yearStart || key > yearEnd) {
                  return <span key={key} className="size-2.5" />
                }
                return <Skeleton key={key} className="size-2.5 rounded-xs" />
              })}
            </div>
          ))}
        </GraphFrame>
      </div>
      <LevelLegend />
    </div>
  )
}

export function AttendanceHeatmap() {
  const summary = useAttendanceSummary()
  const leaves = useQuery({
    queryKey: ["leave", "mine"],
    queryFn: listLeaveRequests,
  })
  const [hover, setHover] = useState<DayHover | null>(null)

  useEffect(() => {
    if (!hover) return
    const clear = () => setHover(null)
    window.addEventListener("scroll", clear, true)
    return () => window.removeEventListener("scroll", clear, true)
  }, [hover])

  const today = manilaToday()
  const yearStart = isoDate(new Date(today.getFullYear(), 0, 1))
  const yearEnd = isoDate(new Date(today.getFullYear(), 11, 31))
  const weeks = weeksForYear(today)
  const labels = monthLabels(weeks, today.getFullYear())

  if (summary.isPending || leaves.isPending) {
    return (
      <AttendanceHeatmapSkeleton
        weeks={weeks}
        labels={labels}
        yearStart={yearStart}
        yearEnd={yearEnd}
      />
    )
  }

  if (summary.isError || leaves.isError) {
    return (
      <p className="text-sm text-destructive">
        {summary.error?.message ??
          leaves.error?.message ??
          "Failed to load attendance"}
      </p>
    )
  }

  const todayIso = isoDate(today)
  const attendance = new Map(
    summary.data.map((row) => [row.date, row.status] as const)
  )
  const leave = new Map<string, LeaveCoverage>()
  for (const request of leaves.data ?? []) {
    if (request.status === "approved") {
      leave.set(request.date, request.coverage)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="w-fit max-w-full self-start overflow-x-auto"
        onPointerLeave={() => setHover(null)}
      >
        <div className="mb-3">
          <GraphFrame labels={labels}>
            {weeks.map((week) => (
              <div key={isoDate(week[0])} className="flex flex-col gap-0.75">
                {week.map((date) => {
                  const tip = tipFor(
                    date,
                    todayIso,
                    yearStart,
                    yearEnd,
                    attendance,
                    leave
                  )
                  if (!tip) {
                    return <span key={isoDate(date)} className="size-2.5" />
                  }
                  return (
                    <span
                      key={isoDate(date)}
                      aria-label={`${tip.when}, ${tip.name}`}
                      className={`size-2.5 rounded-xs ${tip.swatch}`}
                      onPointerEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        setHover({
                          ...tip,
                          top: rect.top,
                          left: rect.left + rect.width / 2,
                        })
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </GraphFrame>
        </div>
        <LevelLegend />
      </div>
      <DayTooltip hover={hover} />
    </div>
  )
}
