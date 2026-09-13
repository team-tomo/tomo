import { useQuery } from "@tanstack/react-query"
import {
  getConversation,
  getLatestConversation,
  listConversations,
} from "@/services/chat-service"

export const chatKeys = {
  all: ["chat"] as const,
  latest: () => [...chatKeys.all, "latest"] as const,
  list: () => [...chatKeys.all, "list"] as const,
  detail: (conversationId: string) =>
    [...chatKeys.all, "detail", conversationId] as const,
}

export function useLatestConversation(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.latest(),
    queryFn: getLatestConversation,
    enabled,
    staleTime: Infinity,
  })
}

export function useConversations(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: listConversations,
    enabled,
  })
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.detail(conversationId ?? ""),
    queryFn: () => getConversation(conversationId!),
    enabled: conversationId !== null,
  })
}
