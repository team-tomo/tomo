import { toast } from "@workspace/ui/components/toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  clockIn,
  clockOut,
  getTodayAttendanceStatus,
} from "@/services/timesheet-service"

export const attendanceKeys = {
  all: ["attendance"] as const,
  todayStatus: () => [...attendanceKeys.all, "today-status"] as const,
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
      queryClient.invalidateQueries({ queryKey: attendanceKeys.todayStatus() })
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
      queryClient.invalidateQueries({ queryKey: attendanceKeys.todayStatus() })
    },
    onError: (error: Error) => {
      toast.add({
        description: error.message ?? "Failed to clock out",
        type: "error",
      })
    },
  })
}
