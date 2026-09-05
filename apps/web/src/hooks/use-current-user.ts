import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { UnauthenticatedError } from "@/lib/api"
import type { UserRole } from "@/schemas/manage-account-schema"

export type CurrentUser = {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole | null
}

async function fetchCurrentUser(): Promise<CurrentUser> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new UnauthenticatedError()
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, role")
    .eq("id", session.user.id)
    .maybeSingle()

  const email = profile?.email ?? session.user.email ?? ""
  const metadataName = session.user.user_metadata?.full_name
  const name =
    profile?.full_name?.trim() ||
    (typeof metadataName === "string" ? metadataName.trim() : "") ||
    email.split("@")[0] ||
    "User"

  return {
    id: session.user.id,
    name,
    email,
    avatar: profile?.avatar_url ?? "",
    role: profile?.role ?? null,
  }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  })
}
