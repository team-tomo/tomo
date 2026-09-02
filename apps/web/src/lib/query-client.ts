import { QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "@workspace/ui/components/toast"

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.add({
        description: error.message || "Something went wrong",
        type: "error",
      })
    },
  }),
})
