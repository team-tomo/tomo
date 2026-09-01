import { supabase } from "@/lib/supabase"
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/auth/change-password") {
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
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
          background: `
          radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
          radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
          radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
          radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
          #000000
        `,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-sm">
        <div className="mb-4 flex items-center justify-center gap-2">
          {/* <img src="/favicon.svg" alt="Tomo" className="h-8 w-8" /> */}
          {/* <span className="text-lg font-medium text-[#ffffff]">Tomo</span> */}
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
