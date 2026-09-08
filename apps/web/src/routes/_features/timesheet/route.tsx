import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BookOpenIcon,
  Calendar03Icon,
  CalendarBlock01Icon,
  News01Icon,
  StickyNote02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { TokiChat, TokiChatPanel, TokiChatTrigger } from "./-toki-chat"

const TIMESHEET_TABS = [
  {
    value: "overview",
    to: "/timesheet",
    label: "Overview",
    icon: News01Icon,
  },
  {
    value: "attendance",
    to: "/timesheet/attendance",
    label: "Attendance",
    icon: Calendar03Icon,
  },
  {
    value: "leaves",
    to: "/timesheet/leaves",
    label: "Leaves",
    icon: CalendarBlock01Icon,
  },
  {
    value: "actuals",
    to: "/timesheet/actuals",
    label: "Actuals",
    icon: StickyNote02Icon,
  },
] as const

type TimesheetTab = (typeof TIMESHEET_TABS)[number]["value"]

function tabFromPath(pathname: string): TimesheetTab {
  const match = TIMESHEET_TABS.find(
    (tab) => tab.value !== "overview" && pathname.startsWith(tab.to)
  )
  return match?.value ?? "overview"
}

export const Route = createFileRoute("/_features/timesheet")({
  component: TimesheetLayout,
})

function TimesheetLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const tab = tabFromPath(pathname)

  return (
    <TokiChat>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="sticky top-12 z-10 flex h-12 shrink-0 items-center justify-between border-b px-2">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const next = TIMESHEET_TABS.find((item) => item.value === value)
              if (next) {
                navigate({ to: next.to })
              }
            }}
          >
            <TabsList>
              {TIMESHEET_TABS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  <HugeiconsIcon icon={item.icon} className="size-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="border-border">
              <HugeiconsIcon icon={BookOpenIcon} className="size-4" />
              Timesheet Guide
            </Button>
            <TokiChatTrigger />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
          <TokiChatPanel />
        </div>
      </div>
    </TokiChat>
  )
}
