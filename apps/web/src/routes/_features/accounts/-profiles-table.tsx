import { HugeiconsIcon } from "@hugeicons/react"
import {
  AtIcon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  Shield01Icon,
  UserIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { useProfiles } from "@/hooks/use-account"
import type { ProfileListItem } from "@/services/account-service"
import type { UserRole } from "@/schemas/manage-account-schema"
import { getInitials } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
  { label: "Active", icon: CheckmarkCircle02Icon },
  { label: "Action", icon: MoreHorizontalIcon },
] as const

const joinDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

export function ProfilesTable() {
  const { data: profiles, isPending, isError } = useProfiles()

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

  return (
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
              profile.manager_id ? (names.get(profile.manager_id) ?? "—") : "—"
            }
          />
        ))}
      </TableBody>
    </Table>
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
}: {
  profile: ProfileListItem
  lead: string
}) {
  return (
    <TableRow>
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
      <TableCell>
        <ProfileActions name={profile.full_name} />
      </TableCell>
    </TableRow>
  )
}

function ProfileActions({ name }: { name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${name}`}
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem>Change lead</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
            <TableCell>
              <Skeleton className="size-6 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
