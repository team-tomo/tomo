import { supabase } from "@/lib/supabase"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_features")({
  component: FeatureLayout,
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
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
