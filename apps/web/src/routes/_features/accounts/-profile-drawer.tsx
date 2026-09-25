import { useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AtIcon,
  Calendar03Icon,
  Call02Icon,
  Loading03Icon,
  Mail01Icon,
  PencilEdit01Icon,
  Shield01Icon,
  UserIcon,
  UserMultiple02Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons"
import { useManagers, useReassignManager } from "@/hooks/use-account"
import { useCurrentUser } from "@/hooks/use-current-user"
import type { ProfileListItem } from "@/services/account-service"
import { isAdminUserRole, type UserRole } from "@/schemas/manage-account-schema"
import { getInitials } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const ROLE_LABEL: Record<UserRole, string> = {
  dev: "Dev",
  executive: "Executive",
  support: "Support",
  lead: "Lead",
  ic: "Individual Contributor",
}

const ROLE_BADGE: Record<UserRole, string> = {
  dev: "border-current bg-sky-500/15 text-sky-700 dark:text-sky-300",
  executive:
    "border-current bg-violet-500/15 text-violet-700 dark:text-violet-300",
  support: "border-current bg-amber-500/15 text-amber-700 dark:text-amber-300",
  lead: "border-current bg-teal-500/15 text-teal-700 dark:text-teal-300",
  ic: "border-current bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

const joinDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

export function ProfileDrawer({
  profile,
  profiles,
  onOpenChange,
}: {
  profile: ProfileListItem | null
  profiles: ProfileListItem[]
  onOpenChange: (open: boolean) => void
}) {
  const { data: currentUser } = useCurrentUser()
  const reassign = useReassignManager()
  const [editing, setEditing] = useState<boolean>(false)
  const [leadId, setLeadId] = useState<string | null>(
    profile?.manager_id ?? null
  )
  const [leadSource, setLeadSource] = useState({
    id: profile?.id,
    managerId: profile?.manager_id,
  })
  const managers = useManagers(editing)

  if (
    profile?.id !== leadSource.id ||
    profile?.manager_id !== leadSource.managerId
  ) {
    setLeadSource({ id: profile?.id, managerId: profile?.manager_id })
    setEditing(false)
    setLeadId(profile?.manager_id ?? null)
  }

  const names = new Map(profiles.map((item) => [item.id, item.full_name]))
  const leadName = profile?.manager_id
    ? (names.get(profile.manager_id) ?? "—")
    : "—"
  const canEdit =
    isAdminUserRole(currentUser?.role) && currentUser?.id !== profile?.id
  const leads = (managers.data ?? []).filter((item) => item.id !== profile?.id)

  const save = () => {
    if (!profile || !leadId || leadId === profile.manager_id) {
      setEditing(false)
      return
    }
    reassign.mutate(
      { profileId: profile.id, managerId: leadId },
      { onSuccess: () => setEditing(false) }
    )
  }

  return (
    <Drawer
      modal={false}
      open={profile != null}
      onOpenChange={onOpenChange}
      swipeDirection="right"
    >
      <DrawerContent>
        {profile ? (
          <>
            <DrawerHeader className="flex-row items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage
                    src={profile.avatar_url ?? ""}
                    alt={profile.full_name}
                  />
                  <AvatarFallback>
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DrawerTitle className="truncate">
                    {profile.full_name}
                  </DrawerTitle>
                  <DrawerDescription className="inline-flex min-w-0 items-center gap-1.5">
                    <HugeiconsIcon
                      icon={Mail01Icon}
                      strokeWidth={2}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{profile.email}</span>
                  </DrawerDescription>
                </div>
              </div>
              {canEdit ? (
                editing ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={reassign.isPending}
                      onClick={() => {
                        setLeadId(profile.manager_id)
                        setEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!leadId || reassign.isPending}
                      onClick={save}
                    >
                      {reassign.isPending ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : null}
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      data-icon="inline-start"
                    />
                    Edit
                  </Button>
                )
              ) : null}
            </DrawerHeader>
            <dl className="flex flex-col gap-3 overflow-y-auto p-4">
              <ProfileField icon={AtIcon} label="Username">
                {profile.username || "—"}
              </ProfileField>
              <ProfileField icon={Mail01Icon} label="Email">
                {profile.email}
              </ProfileField>
              <ProfileField icon={Shield01Icon} label="Role">
                <Badge variant="outline" className={ROLE_BADGE[profile.role]}>
                  {ROLE_LABEL[profile.role]}
                </Badge>
              </ProfileField>
              <ProfileField icon={UserIcon} label="Status">
                <Badge
                  variant="outline"
                  className={
                    profile.is_active
                      ? "border-current bg-green-500/15 text-green-700 dark:text-green-300"
                      : "border-current bg-destructive/10 text-destructive"
                  }
                >
                  {profile.is_active ? "Active" : "Inactive"}
                </Badge>
              </ProfileField>
              <ProfileField icon={WorkIcon} label="Job title">
                {profile.job_title || "—"}
              </ProfileField>
              <ProfileField icon={Call02Icon} label="Phone">
                {profile.phone || "—"}
              </ProfileField>
              <ProfileField icon={UserMultiple02Icon} label="Lead">
                {editing ? (
                  <Select
                    value={leadId}
                    onValueChange={(value) => {
                      if (value) {
                        setLeadId(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a lead">
                        {leadId ? (names.get(leadId) ?? "Select a lead") : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {managers.isPending ? (
                          <SelectItem value="loading" disabled>
                            Loading leads…
                          </SelectItem>
                        ) : null}
                        {managers.isError ? (
                          <SelectItem value="error" disabled>
                            Could not load leads
                          </SelectItem>
                        ) : null}
                        {!managers.isPending &&
                        !managers.isError &&
                        leads.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No other lead to assign
                          </SelectItem>
                        ) : null}
                        {leads.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.full_name || item.username || "—"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  leadName
                )}
              </ProfileField>
              <ProfileField icon={Calendar03Icon} label="Join date">
                {joinDate.format(new Date(profile.created_at))}
              </ProfileField>
              <ProfileField icon={UserIcon} label="Bio">
                {profile.bio || "—"}
              </ProfileField>
            </dl>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function ProfileField({
  icon,
  label,
  children,
}: {
  icon: typeof UserIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground">{children}</dd>
    </div>
  )
}
