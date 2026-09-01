import { supabase } from "@/lib/supabase"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_features")({
  component: FeatureLayout,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({ to: "/auth/signin" })
    }
  },
})

function FeatureLayout() {
  return (
    <div>
      Hello "/_features"!
      <Outlet />
    </div>
  )
}
