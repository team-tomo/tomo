import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AtIcon,
  Calendar03Icon,
  Call02Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  Shield01Icon,
  UserIcon,
  UserMultiple02Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons"
import { useProfiles } from "@/hooks/use-account"
import type { ProfileListItem } from "@/services/account-service"
import type { UserRole } from "@/schemas/manage-account-schema"
import { getInitials } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
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

export function ProfilesTable() {
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

  const names = new Map(
    profiles.map((profile) => [profile.id, profile.full_name])
  )
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null
  const selectedLead = selected?.manager_id
    ? (names.get(selected.manager_id) ?? "—")
    : "—"

  return (
    <>
      <Table className={tableInset}>
        <TableHeader>
          <ProfileTableHeads />
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              lead={
                profile.manager_id
                  ? (names.get(profile.manager_id) ?? "—")
                  : "—"
              }
              selected={profile.id === selectedId}
              onSelect={() => setSelectedId(profile.id)}
            />
          ))}
        </TableBody>
      </Table>
      <ProfileDrawer
        profile={selected}
        lead={selectedLead}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
          }
        }}
      />
    </>
  )
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
  lead: string
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
      <TableCell>{lead}</TableCell>
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

function ProfileDrawer({
  profile,
  lead,
  onOpenChange,
}: {
  profile: ProfileListItem | null
  lead: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer
      open={profile != null}
      onOpenChange={onOpenChange}
      swipeDirection="right"
    >
      <DrawerContent>
        {profile ? (
          <>
            <DrawerHeader className="flex-row items-center gap-3">
              <Avatar>
                <AvatarImage
                  src={profile.avatar_url ?? ""}
                  alt={profile.full_name}
                />
                <AvatarFallback>
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <DrawerTitle className="truncate">
                  {profile.full_name}
                </DrawerTitle>
                <DrawerDescription className="truncate">
                  {profile.email}
                </DrawerDescription>
              </div>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={ROLE_BADGE[profile.role]}>
                  {ROLE_LABEL[profile.role]}
                </Badge>
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
              </div>
              <dl className="flex flex-col gap-3">
                <ProfileDetail icon={AtIcon} label="Username">
                  {profile.username || "—"}
                </ProfileDetail>
                <ProfileDetail icon={WorkIcon} label="Job title">
                  {profile.job_title || "—"}
                </ProfileDetail>
                <ProfileDetail icon={Call02Icon} label="Phone">
                  {profile.phone || "—"}
                </ProfileDetail>
                <ProfileDetail icon={UserMultiple02Icon} label="Lead">
                  {lead}
                </ProfileDetail>
                <ProfileDetail icon={Calendar03Icon} label="Join date">
                  {joinDate.format(new Date(profile.created_at))}
                </ProfileDetail>
                <ProfileDetail icon={UserIcon} label="Bio">
                  {profile.bio || "—"}
                </ProfileDetail>
              </dl>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function ProfileDetail({
  icon,
  label,
  children,
}: {
  icon: typeof UserIcon
  label: string
  children: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
        {label}
      </dt>
      <dd className="text-foreground">{children}</dd>
    </div>
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
