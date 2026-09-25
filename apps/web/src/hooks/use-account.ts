import { toast } from "@workspace/ui/components/toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createInvitation,
  getAccountProfile,
  listProfiles,
  updateProfile,
} from "@/services/account-service"

export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
  profiles: () => [...accountKeys.all, "profiles"] as const,
}

export function useAccountProfile() {
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: getAccountProfile,
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: accountKeys.profiles(),
    queryFn: listProfiles,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      toast.add({
        description: "Profile updated successfully",
        type: "success",
      })
      queryClient.setQueryData(accountKeys.profile(), profile)
      queryClient.invalidateQueries({ queryKey: ["current-user"] })
    },
    onError: (error: Error) => {
      toast.add({
        description: error.message ?? "Failed to update profile",
        type: "error",
      })
    },
  })
}

export function useCreateInvitation() {
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      toast.add({
        description: "Invitation code created",
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.add({
        description: error.message ?? "Failed to create invitation code",
        type: "error",
      })
    },
  })
}
