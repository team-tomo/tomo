import { toast } from "@workspace/ui/components/toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  clockIn,
  clockOut,
  getTodayAttendanceStatus,
  listAttendance,
  listAttendanceSummary,
  type AttendanceQuery,
} from "@/services/timesheet-service"

export const attendanceKeys = {
  all: ["attendance"] as const,
  todayStatus: () => [...attendanceKeys.all, "today-status"] as const,
  summary: () => [...attendanceKeys.all, "summary"] as const,
  list: (fromDate?: string, toDate?: string) =>
    [...attendanceKeys.all, "list", fromDate ?? null, toDate ?? null] as const,
}

export function useTodayAttendanceStatus() {
  return useQuery({
    queryKey: attendanceKeys.todayStatus(),
    queryFn: getTodayAttendanceStatus,
  })
}

export function useClockIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      toast.add({
        description: "Clocked in successfully",
        type: "success",
      })
      queryClient.setQueryData(attendanceKeys.todayStatus(), {
        can_clock_in: false,
        can_clock_out: true,
      })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
    onError: (error: Error) => {
      toast.add({
        description: error.message ?? "Failed to clock in",
        type: "error",
      })
    },
  })
}

export function useClockOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      toast.add({
        description: "Clocked out successfully",
        type: "success",
      })
      queryClient.setQueryData(attendanceKeys.todayStatus(), {
        can_clock_in: false,
        can_clock_out: false,
      })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
    onError: (error: Error) => {
      toast.add({
        description: error.message ?? "Failed to clock out",
        type: "error",
      })
    },
  })
}

export function useAttendanceSummary() {
  return useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: listAttendanceSummary,
  })
}

export function useAttendance(query: AttendanceQuery = {}, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.list(query.from_date, query.to_date),
    queryFn: () => listAttendance(query),
    enabled,
  })
}
