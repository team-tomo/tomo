import { getLatestConversation } from "@/services/chat-service"
import { useQuery } from "@tanstack/react-query"

export const chatKeys = {
  all: ["chat"] as const,
  latest: () => [...chatKeys.all, "latest"] as const,
}

export function useLatestConversation(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.latest(),
    queryFn: getLatestConversation,
    enabled,
    staleTime: Infinity,
  })
}
