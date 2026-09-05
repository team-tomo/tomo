import { QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "@workspace/ui/components/toast"
import { UnauthenticatedError } from "@/lib/api"

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof UnauthenticatedError) return

      toast.add({
        description: error.message || "Something went wrong",
        type: "error",
      })
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof UnauthenticatedError) && failureCount < 3,
    },
  },
})
