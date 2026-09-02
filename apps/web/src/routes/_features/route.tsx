import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Appointment01Icon,
  CalendarRemove01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { ClockOutSchema, type ClockOutInput } from "@/schemas/timesheet-schema"
import {
  useClockIn,
  useClockOut,
  useTodayAttendanceStatus,
} from "@/hooks/use-timesheet"
import { Textarea } from "@workspace/ui/components/textarea"
import HeaderBreadcrumb from "@/components/sidebar/header-breadcrumb"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@workspace/ui/components/button"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider, SidebarInset } from "@workspace/ui/components/sidebar"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"

export const Route = createFileRoute("/_features")({
  component: FeatureLayout,
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({ to: "/auth/signin" })
    }
  },
})

function FeatureLayout() {
  const [open, setOpen] = useState<boolean>(false)
  const { data: attendanceStatus, isLoading } = useTodayAttendanceStatus()
  const { mutate: clockInMutation, isPending: isClockingIn } = useClockIn()
  const { mutate: clockOutMutation, isPending: isClockingOut } = useClockOut()

  const canClockIn = attendanceStatus?.can_clock_in ?? false
  const canClockOut = attendanceStatus?.can_clock_out ?? false

  const form = useForm<ClockOutInput>({
    resolver: zodResolver(ClockOutSchema),
    defaultValues: {
      notes: "",
    },
  })

  const onSubmit = (data: ClockOutInput) => {
    clockOutMutation(data.notes ?? "", {
      onSuccess: () => {
        setOpen(false)
        form.reset({ notes: "" })
      },
    })
  }

  const handleClockOutDialogOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      form.reset({ notes: "" })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClockOutDialogOpenChange}>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-sidebar px-2">
            <HeaderBreadcrumb />
            <div className="ml-auto flex items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-6 w-24 rounded-sm" />
              ) : canClockOut && !canClockIn ? (
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  <HugeiconsIcon
                    icon={CalendarRemove01Icon}
                    className="size-4"
                  />
                  Clock Out
                </AlertDialogTrigger>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-600 disabled:opacity-50"
                  disabled={(!canClockIn && !canClockOut) || isClockingIn}
                  onClick={() => clockInMutation()}
                >
                  {isClockingIn ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={Appointment01Icon}
                      className="size-4"
                    />
                  )}
                  {isClockingIn ? "Clocking in..." : "Clock In"}
                </Button>
              )}
            </div>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium text-primary">
            Are you sure you want to clock out?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You will not be able to clock in again until the next day.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form id="clock-out-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet>
            <FieldGroup>
              <Controller
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="notes">Notes</FieldLabel>
                    <Textarea
                      {...field}
                      id="notes"
                      placeholder="What did you work on today?"
                      aria-invalid={fieldState.invalid}
                      maxLength={200}
                      autoFocus
                    />
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                    <FieldDescription className="italic">
                      This note is saved with your clock-out record. It can be
                      used by the AI agent workflow when drafting weekly
                      actuals.
                    </FieldDescription>
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <Button
            type="submit"
            form="clock-out-form"
            variant="destructive"
            className="mt-4 w-full"
            disabled={isClockingOut}
          >
            {isClockingOut ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                />
                Clocking out...
              </>
            ) : (
              "Clock out"
            )}
          </Button>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
