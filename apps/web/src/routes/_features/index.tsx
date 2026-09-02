import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"
import { useSignOut } from "@/hooks/use-auth"
import { queryClient } from "@/lib/query-client"
import { toast } from "@workspace/ui/components/toast"

export const Route = createFileRoute("/_features/")({
  component: HomePage,
})

function HomePage() {
  const signOut = useSignOut()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear()
        navigate({ to: "/auth/signin" })
      },
      onError: (error) => {
        toast.add({
          description: error.message,
          type: "error",
        })
      },
    })
  }

  return (
    <div className="flex p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
        <div className="tex -xs font-mono text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}
