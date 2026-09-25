import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { createFileRoute } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpDownIcon,
  BookOpenIcon,
  Copy01Icon,
  Csv01Icon,
  FilterIcon,
  Loading03Icon,
  Pdf01Icon,
  Ticket03Icon,
} from "@hugeicons/core-free-icons"
import { useCreateInvitation } from "@/hooks/use-account"
import {
  CreateInvitationSchema,
  UserRoleSchema,
  type CreateInvitationInput,
  type UserRole,
} from "@/schemas/manage-account-schema"
import {
  ProfilesTable,
  type ProfileSort,
  type ProfileStatusFilter,
} from "./-profiles-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "@workspace/ui/components/toast"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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

const ROLES = UserRoleSchema.options

function generateInviteCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz"
  const letters = new Uint8Array(5)
  const digits = new Uint8Array(5)
  crypto.getRandomValues(letters)
  crypto.getRandomValues(digits)
  const word = Array.from(
    letters,
    (byte) => alphabet[byte % alphabet.length]
  ).join("")
  const number = Array.from(digits, (byte) => String(byte % 10)).join("")
  return `tomo-${word}-${number}`
}

async function copyInviteCode(code: string) {
  const value = code.trim()
  if (!value) {
    return
  }

  try {
    await navigator.clipboard.writeText(value)
    toast.add({ description: "Invitation code copied", type: "success" })
  } catch {
    toast.add({ description: "Could not copy invitation code", type: "error" })
  }
}

export const Route = createFileRoute("/_features/accounts/")({
  component: AccountsPage,
})

const SORT_LABEL: Record<ProfileSort, string> = {
  name: "Name",
  role: "Role",
  joined: "Join date",
  status: "Status",
}

function AccountsPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [sort, setSort] = useState<ProfileSort>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [statusFilter, setStatusFilter] = useState<ProfileStatusFilter>("all")

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background px-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" onClick={() => setInviteOpen(true)}>
            <HugeiconsIcon icon={Ticket03Icon} className="size-4" />
            Create Invite Code
          </Button>
          <Button type="button" variant="outline" disabled>
            <HugeiconsIcon icon={Csv01Icon} className="size-4 text-green-600" />
            Download CSV
          </Button>
          <Button type="button" variant="outline" disabled>
            <HugeiconsIcon
              icon={Pdf01Icon}
              className="size-4 text-destructive"
            />
            Download PDF
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" />}
            >
              <HugeiconsIcon icon={ArrowUpDownIcon} data-icon="inline-start" />
              Sort
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup className="flex flex-col gap-px">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as ProfileSort)}
                >
                  {(Object.keys(SORT_LABEL) as ProfileSort[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {SORT_LABEL[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="flex flex-col gap-px">
                <DropdownMenuRadioGroup
                  value={sortDirection}
                  onValueChange={(value) =>
                    setSortDirection(value as "asc" | "desc")
                  }
                >
                  <DropdownMenuRadioItem value="asc">
                    Ascending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">
                    Descending
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" />}
            >
              <HugeiconsIcon icon={FilterIcon} data-icon="inline-start" />
              Filter
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup className="flex flex-col gap-px">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as ProfileStatusFilter)
                  }
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">
                    Active
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">
                    Inactive
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="flex flex-col gap-px">
                <DropdownMenuLabel>Role</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={roleFilter}
                  onValueChange={(value) =>
                    setRoleFilter(value as UserRole | "all")
                  }
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  {ROLES.map((role) => (
                    <DropdownMenuRadioItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="secondary" className="border-border">
            <HugeiconsIcon icon={BookOpenIcon} className="size-4" />
            Account Management Guide
          </Button>
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <ProfilesTable
          sort={sort}
          sortDirection={sortDirection}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
        />
      </div>
      <CreateInviteCodeDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}

function CreateInviteCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createInvitation = useCreateInvitation()
  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(CreateInvitationSchema),
    defaultValues: {
      code: "",
      role: "ic",
    },
  })

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      form.reset({ code: "", role: "ic" })
    }
  }

  const onSubmit = (data: CreateInvitationInput) => {
    createInvitation.mutate(data, {
      onSuccess: () => close(false),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium text-primary">
            Create Invitation
          </AlertDialogTitle>
          <AlertDialogDescription>
            The code assigns this role when someone signs up with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          id="create-invite-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="invite-code">
                      Invitation Code
                    </FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 leading-6 font-medium underline-offset-4 hover:bg-transparent hover:underline dark:hover:bg-transparent"
                      onClick={() => field.onChange(generateInviteCode())}
                    >
                      Generate Invitation Code
                    </Button>
                  </div>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="invite-code"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      autoFocus
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label="Copy invitation code"
                        size="icon-xs"
                        disabled={!field.value.trim()}
                        onClick={() => {
                          void copyInviteCode(field.value)
                        }}
                      >
                        <HugeiconsIcon icon={Copy01Icon} />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue>{ROLE_LABEL[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start" className="p-1">
                      <SelectGroup className="flex flex-col gap-px p-0">
                        <SelectLabel>Platform Role</SelectLabel>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <AlertDialogFooter className="mt-1 flex-col sm:flex-col">
          <Button
            type="submit"
            form="create-invite-form"
            className="w-full"
            disabled={createInvitation.isPending}
          >
            {createInvitation.isPending ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            ) : null}
            {createInvitation.isPending ? "Creating..." : "Create Invitation"}
          </Button>
          <AlertDialogCancel
            className="w-full"
            disabled={createInvitation.isPending}
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
