import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Appointment01Icon,
  Calendar03Icon,
  CalendarRemove01Icon,
  MoreHorizontalIcon,
  Note01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { useAttendance, useUpdateAttendance } from "@/hooks/use-timesheet"
import {
  AttendanceUpdateSchema,
  type AttendanceUpdateInput,
} from "@/schemas/timesheet-schema"
import type {
  AttendanceRecord,
  AttendanceUpdateBody,
} from "@/services/timesheet-service"

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const timeInputFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

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

// YYYY-MM-DD is a calendar date. `new Date(iso)` would read it as UTC.
function formatRowDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return dateFormat.format(new Date(year, month - 1, day))
}

function formatClock(iso: string | null) {
  if (!iso) return "-"
  return timeFormat.format(new Date(iso))
}

function manilaClock(iso: string | null) {
  if (!iso) return null
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return null
  const parts = timeInputFormat.formatToParts(when)
  const rawHour = parts.find((part) => part.type === "hour")?.value ?? "00"
  // Intl hourCycle h23 can report midnight as 24.
  const hour = rawHour === "24" ? "00" : rawHour
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"
  const second = parts.find((part) => part.type === "second")?.value ?? "00"
  return {
    hm: `${hour}:${minute}`,
    hms: `${hour}:${minute}:${second}`,
  }
}

function timeInputValue(iso: string | null) {
  return manilaClock(iso)?.hm ?? ""
}

// The field edits hours and minutes. Keep the stored seconds when those
// didn't change, so a 09:00:01 clock-in stays late.
function submittedClock(edited: string, originalIso: string | null) {
  const original = manilaClock(originalIso)
  if (original && edited === original.hm) return original.hms
  const [hour = "00", minute = "00", second = "00"] = edited.split(":")
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`
}

function HistorySkeleton() {
  return (
    <Table>
      <TableHeader>
        <HistoryHeads />
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 6 }, (_, cell) => (
              <TableCell key={cell}>
                <Skeleton className="h-4 w-16" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const COLUMNS = [
  { label: "Date", icon: Calendar03Icon },
  { label: "Time in", icon: Appointment01Icon },
  { label: "Time out", icon: CalendarRemove01Icon },
  { label: "Late", icon: Alert02Icon },
  { label: "Notes", icon: Note01Icon },
  { label: "Action", icon: PencilEdit02Icon },
] as const

function HistoryHeads() {
  return (
    <TableRow className="border-t">
      {COLUMNS.map((column) => (
        <TableHead key={column.label}>
          <span className="inline-flex items-center gap-1.5">
            <HugeiconsIcon
              icon={column.icon}
              strokeWidth={2}
              className="size-3.5"
            />
            {column.label}
          </span>
        </TableHead>
      ))}
    </TableRow>
  )
}

export function AttendanceHistory() {
  const today = manilaToday()
  const attendance = useAttendance({
    from_date: isoDate(addDays(today, -29)),
    to_date: isoDate(today),
  })
  const update = useUpdateAttendance()
  const [editing, setEditing] = useState<AttendanceRecord | null>(null)

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Attendance History</h2>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
      </div>
      {attendance.isPending ? (
        <HistorySkeleton />
      ) : attendance.isError ? (
        <p className="text-sm text-destructive">{attendance.error.message}</p>
      ) : attendance.data.length === 0 ? (
        <p className="text-sm">No attendance in the last 30 days.</p>
      ) : (
        <Table>
          <TableHeader>
            <HistoryHeads />
          </TableHeader>
          <TableBody>
            {attendance.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatRowDate(row.date)}</TableCell>
                <TableCell>{formatClock(row.time_in)}</TableCell>
                <TableCell>{formatClock(row.time_out)}</TableCell>
                <TableCell>{row.is_late ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <span
                    className="block max-w-48 truncate"
                    title={row.notes ?? undefined}
                  >
                    {row.notes ?? "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="-ml-1"
                    aria-label={`Update ${formatRowDate(row.date)}`}
                    onClick={() => {
                      update.reset()
                      setEditing(row)
                    }}
                  >
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      strokeWidth={2}
                      className="size-4"
                    />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <UpdateAttendanceDialog
        row={editing}
        pending={update.isPending}
        errorMessage={update.isError ? update.error.message : null}
        onClose={() => setEditing(null)}
        onSave={(body) => {
          if (!editing) return
          update.mutate(
            { id: editing.id, body },
            { onSuccess: () => setEditing(null) }
          )
        }}
      />
    </section>
  )
}

function UpdateAttendanceDialog({
  row,
  pending,
  errorMessage,
  onClose,
  onSave,
}: {
  row: AttendanceRecord | null
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  onSave: (body: AttendanceUpdateBody) => void
}) {
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        {row ? (
          <UpdateAttendanceForm
            key={row.id}
            row={row}
            pending={pending}
            errorMessage={errorMessage}
            onClose={onClose}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function UpdateAttendanceForm({
  row,
  pending,
  errorMessage,
  onClose,
  onSave,
}: {
  row: AttendanceRecord
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  onSave: (body: AttendanceUpdateBody) => void
}) {
  const form = useForm<AttendanceUpdateInput>({
    resolver: zodResolver(AttendanceUpdateSchema),
    defaultValues: {
      time_in: timeInputValue(row.time_in),
      time_out: timeInputValue(row.time_out),
      notes: row.notes ?? "",
    },
  })

  const onSubmit = (data: AttendanceUpdateInput) => {
    onSave({
      time_in: submittedClock(data.time_in, row.time_in),
      time_out: data.time_out
        ? submittedClock(data.time_out, row.time_out)
        : null,
      notes: data.notes ? data.notes : null,
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Update attendance</DialogTitle>
        <DialogDescription>{formatRowDate(row.date)}</DialogDescription>
      </DialogHeader>
      <FieldSet className="mt-4">
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="time_in"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="attendance-time-in">Time in</FieldLabel>
                  <Input
                    {...field}
                    id="attendance-time-in"
                    type="time"
                    required
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="time_out"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="attendance-time-out">
                      Time out
                    </FieldLabel>
                    {field.value ? (
                      <button
                        type="button"
                        className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => field.onChange("")}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <Input
                    {...field}
                    id="attendance-time-out"
                    type="time"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
          </div>
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="attendance-notes">Notes</FieldLabel>
                <Textarea
                  {...field}
                  id="attendance-notes"
                  maxLength={200}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.error ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>
      {errorMessage ? (
        <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
      ) : null}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
