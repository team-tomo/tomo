import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Loading03Icon,
  LogOut,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { useSignOut } from "@/hooks/use-auth"
import { useTheme } from "@/components/theme-provider"
import { toast } from "@workspace/ui/components/toast"
import { Button } from "@workspace/ui/components/button"
import { LeftContent } from "./-left-content"
import { RightContent } from "./-right-content"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export const Route = createFileRoute("/_features/settings/")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useSignOut()
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        setIsSignOutDialogOpen(false)
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
    <div className="mx-auto flex h-full w-250 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Button
          className="text-muted-foreground"
          variant="secondary"
          onClick={() => navigate({ to: "/" })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} />
          </Button>
          <Button
            className="gap-1"
            type="button"
            variant="destructive"
            onClick={() => setIsSignOutDialogOpen(true)}
          >
            <HugeiconsIcon icon={LogOut} />
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-20 md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="py-4">
          <LeftContent />
        </aside>
        <section className="py-4">
          <RightContent />
        </section>
      </div>

      <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to
              use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSignOutDialogOpen(false)}
              disabled={signOut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              disabled={signOut.isPending}
            >
              {signOut.isPending ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="size-4 animate-spin"
                  />
                  Signing out...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={LogOut} />
                  Sign out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
