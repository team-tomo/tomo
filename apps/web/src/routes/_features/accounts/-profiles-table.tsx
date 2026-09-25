import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AtIcon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  Shield01Icon,
  UserIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { useProfiles } from "@/hooks/use-account"
import type { ProfileListItem } from "@/services/account-service"
import type { UserRole } from "@/schemas/manage-account-schema"
import { ProfileDrawer } from "./-profile-drawer"
import { getInitials } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

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

const tableInset =
  "[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4"

const COLUMNS = [
  { label: "Name", icon: UserIcon },
  { label: "Username", icon: AtIcon },
  { label: "Email", icon: Mail01Icon },
  { label: "Role", icon: Shield01Icon },
  { label: "Lead", icon: UserMultiple02Icon },
  { label: "Join date", icon: Calendar03Icon },
  { label: "Status", icon: CheckmarkCircle02Icon },
] as const

const joinDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

export type ProfileSort = "name" | "role" | "joined" | "status"
export type ProfileStatusFilter = "all" | "active" | "inactive"

export function ProfilesTable({
  sort,
  sortDirection,
  roleFilter,
  statusFilter,
}: {
  sort: ProfileSort
  sortDirection: "asc" | "desc"
  roleFilter: UserRole | "all"
  statusFilter: ProfileStatusFilter
}) {
  const { data: profiles, isPending, isError } = useProfiles()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (isPending) {
    return <ProfilesTableSkeleton />
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Could not load profiles</EmptyTitle>
          <EmptyDescription>Refresh the page and try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (!profiles?.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No profiles yet</EmptyTitle>
          <EmptyDescription>
            Profiles appear here after someone joins with an invitation code.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null
  const visible = profiles
    .filter((profile) => {
      if (roleFilter !== "all" && profile.role !== roleFilter) {
        return false
      }
      if (statusFilter === "active") {
        return profile.is_active
      }
      if (statusFilter === "inactive") {
        return !profile.is_active
      }
      return true
    })
    .sort((a, b) => compareProfiles(a, b, byId, sort, sortDirection))

  return (
    <>
      <Table className={tableInset}>
        <TableHeader>
          <ProfileTableHeads />
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="h-24 text-center">
                No profiles match this filter.
              </TableCell>
            </TableRow>
          ) : null}
          {visible.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              lead={
                profile.manager_id
                  ? (byId.get(profile.manager_id) ?? null)
                  : null
              }
              selected={profile.id === selectedId}
              onSelect={() => setSelectedId(profile.id)}
            />
          ))}
        </TableBody>
      </Table>
      <ProfileDrawer
        profile={selected}
        profiles={profiles}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
          }
        }}
      />
    </>
  )
}

function compareProfiles(
  a: ProfileListItem,
  b: ProfileListItem,
  byId: Map<string, ProfileListItem>,
  sort: ProfileSort,
  direction: "asc" | "desc"
) {
  const leadName = (profile: ProfileListItem) =>
    profile.manager_id ? (byId.get(profile.manager_id)?.full_name ?? "") : ""
  const value = {
    name: a.full_name.localeCompare(b.full_name),
    role: a.role.localeCompare(b.role),
    joined: new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    status: Number(a.is_active) - Number(b.is_active),
  }[sort]
  const ranked = value || leadName(a).localeCompare(leadName(b))
  return direction === "asc" ? ranked : -ranked
}

function ProfileTableHeads() {
  return (
    <TableRow>
      {COLUMNS.map((column) => (
        <TableHead key={column.label}>
          <span className="inline-flex items-center gap-1.5">
            <HugeiconsIcon
              icon={column.icon}
              strokeWidth={2}
              className="size-3.5"
            />
            {column.label}
          </span>
        </TableHead>
      ))}
    </TableRow>
  )
}

function ProfileRow({
  profile,
  lead,
  selected,
  onSelect,
}: {
  profile: ProfileListItem
  lead: ProfileListItem | null
  selected: boolean
  onSelect: () => void
}) {
  return (
    <TableRow
      tabIndex={0}
      role="button"
      data-state={selected ? "selected" : undefined}
      aria-label={`View ${profile.full_name}`}
      className="cursor-pointer"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage
              src={profile.avatar_url ?? ""}
              alt={profile.full_name}
            />
            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{profile.full_name}</span>
        </div>
      </TableCell>
      <TableCell>{profile.username || "—"}</TableCell>
      <TableCell className="text-muted-foreground">{profile.email}</TableCell>
      <TableCell>
        <Badge variant="outline" className={ROLE_BADGE[profile.role]}>
          {ROLE_LABEL[profile.role]}
        </Badge>
      </TableCell>
      <TableCell>
        {lead ? (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={lead.avatar_url ?? ""} alt={lead.full_name} />
              <AvatarFallback>{getInitials(lead.full_name)}</AvatarFallback>
            </Avatar>
            <span>{lead.full_name}</span>
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>{joinDate.format(new Date(profile.created_at))}</TableCell>
      <TableCell>
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
      </TableCell>
    </TableRow>
  )
}

function ProfilesTableSkeleton() {
  return (
    <Table className={tableInset}>
      <TableHeader>
        <ProfileTableHeads />
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14 rounded-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
