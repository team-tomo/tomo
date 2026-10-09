import { supabase } from "@/lib/supabase"
import { SpiralsIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/auth/change-password") {
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#0a0a0a",
          backgroundImage: `
       radial-gradient(circle at 25% 25%, #222222 0.5px, transparent 1px),
       radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
     `,
          backgroundSize: "10px 10px",
          imageRendering: "pixelated",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-sm">
        <div className="mb-4 flex items-center justify-center gap-2">
          <HugeiconsIcon icon={SpiralsIcon} className="h-8 w-8 text-primary" />
        </div>

        <Outlet />

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link
            to="/"
            className="text-[#ffffff] underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to="/"
            className="text-[#ffffff] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
