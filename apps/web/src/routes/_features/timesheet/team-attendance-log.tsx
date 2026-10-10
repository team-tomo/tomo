import { HugeiconsIcon } from "@hugeicons/react"
import {
  Appointment01Icon,
  CalendarRemove01Icon,
} from "@hugeicons/core-free-icons"
import { getInitials } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"

type AttendanceStatus = "present" | "sick-leave" | "vacation-leave"

type MemberLog = {
  name: string
  timeIn: string | null
  timeOut: string | null
  status: AttendanceStatus
  office: string | null
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  "sick-leave": "Sick leave",
  "vacation-leave": "Vacation leave",
}

type DayLog = {
  id: "today" | "yesterday"
  label: string
  rows: MemberLog[]
}

const CLOCKS: Array<Pick<MemberLog, "timeIn" | "timeOut">> = [
  { timeIn: "8:41 AM", timeOut: "6:02 PM" },
  { timeIn: "8:55 AM", timeOut: "5:48 PM" },
  { timeIn: "9:06 AM", timeOut: null },
  { timeIn: null, timeOut: null },
  { timeIn: "8:33 AM", timeOut: "6:15 PM" },
]

const SAMPLE_STATUSES: AttendanceStatus[] = [
  "present",
  "present",
  "sick-leave",
  "vacation-leave",
  "present",
]

const OFFICES = ["Uptown Tower 2", "Cebu", "CG2"]

const PLACEHOLDER_GRADIENTS = [
  "bg-gradient-to-br from-emerald-200 to-teal-400 text-emerald-950",
  "bg-gradient-to-br from-sky-200 to-blue-400 text-sky-950",
  "bg-gradient-to-br from-amber-200 to-orange-300 text-orange-950",
  "bg-gradient-to-br from-rose-200 to-pink-400 text-rose-950",
  "bg-gradient-to-br from-violet-200 to-purple-400 text-violet-950",
  "bg-gradient-to-br from-cyan-200 to-sky-400 text-cyan-950",
  "bg-gradient-to-br from-lime-200 to-green-400 text-green-950",
  "bg-gradient-to-br from-fuchsia-200 to-pink-400 text-fuchsia-950",
]

function placeholderGradient(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length]
}

function sampleRows(): MemberLog[] {
  let officeCount = 0
  return Array.from({ length: 15 }, (_, index) => {
    const clock = CLOCKS[index % CLOCKS.length]
    const status = SAMPLE_STATUSES[index % SAMPLE_STATUSES.length]
    const onLeave = status !== "present"
    const inOffice = status === "present" && index % 2 === 0
    return {
      name: `Teammate ${index + 1}`,
      timeIn: onLeave ? null : clock.timeIn,
      timeOut: onLeave ? null : clock.timeOut,
      status,
      office: inOffice ? OFFICES[officeCount++ % OFFICES.length] : null,
    }
  })
}

const SAMPLE_LOGS: DayLog[] = [
  { id: "today", label: "Today", rows: sampleRows() },
  { id: "yesterday", label: "Yesterday", rows: sampleRows() },
]

function outText(day: DayLog["id"], timeOut: string | null) {
  if (timeOut) return timeOut
  return day === "today" ? "Still in" : "No out"
}

export function TeamAttendanceLog() {
  return (
    <aside className="flex h-full min-h-0 w-120 shrink-0 flex-col overflow-hidden border-l">
      <h2 className="z-10 shrink-0 bg-background px-5 pt-6 pb-2 text-sm font-medium">
        Attendance Logs
      </h2>
      <div className="min-h-0 flex-1 scroll-fade-y overflow-y-auto [scroll-fade-size:2.5rem]">
        <div className="flex flex-col gap-6 px-5 pb-6">
          {SAMPLE_LOGS.map((day) => (
            <section key={day.id} className="flex flex-col gap-1">
              <h3 className="px-1 text-sm font-medium text-muted-foreground">
                {day.label}
              </h3>
              <ul className="flex flex-col">
                {day.rows.map((row) => (
                  <li
                    key={`${day.id}-${row.name}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-3 gap-y-2 border-b px-1 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Avatar size="sm" className="size-4!">
                        <AvatarFallback
                          className={`text-[8px]! font-medium ${placeholderGradient(row.name)}`}
                        >
                          {getInitials(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate">{row.name}</p>
                    </div>
                    <p className="text-right text-muted-foreground">
                      Status: {STATUS_LABEL[row.status]}
                    </p>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={Appointment01Icon}
                          className="size-3.5 shrink-0"
                        />
                        {row.timeIn ?? "-"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={CalendarRemove01Icon}
                          className="size-3.5 shrink-0"
                        />
                        {row.timeIn ? outText(day.id, row.timeOut) : "-"}
                      </span>
                    </div>
                    <p className="text-right text-muted-foreground">
                      In-Office: {row.office ? `Yes (${row.office})` : "No"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </aside>
  )
}
