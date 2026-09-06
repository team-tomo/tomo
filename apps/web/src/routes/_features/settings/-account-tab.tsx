import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { HugeiconsIcon } from "@hugeicons/react"
import { SaveIcon } from "@hugeicons/core-free-icons"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ACCOUNT_FIELD_LIMITS,
  DISABLE_ACCOUNT_CONFIRMATION,
  type AccountSettingsInput,
  AccountSettingsSchema,
  type DangerZoneInput,
  DangerZoneSchema,
  type DisableAccountConfirmationInput,
  DisableAccountConfirmationSchema,
} from "@/schemas/settings-schema"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

export function AccountTab() {
  const form = useForm<AccountSettingsInput>({
    resolver: zodResolver(AccountSettingsSchema),
    defaultValues: {
      full_name: "",
      username: "",
      bio: "",
      job_title: "",
      phone: "",
    },
  })
  const dangerForm = useForm<DangerZoneInput>({
    resolver: zodResolver(DangerZoneSchema),
    defaultValues: {
      disable_account: false,
    },
  })
  const confirmForm = useForm<DisableAccountConfirmationInput>({
    resolver: zodResolver(DisableAccountConfirmationSchema),
    defaultValues: {
      confirmation: "",
    },
  })
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const disableAccount = dangerForm.watch("disable_account")
  const confirmation = confirmForm.watch("confirmation")

  const handleConfirmOpenChange = (open: boolean) => {
    setIsConfirmOpen(open)
    if (!open) {
      confirmForm.reset()
    }
  }

  return (
    <div>
      <form id="account-settings-form">
        <FieldSet className="flex flex-col gap-4 py-4">
          <h2 className="text-lg font-bold">Profile Information</h2>
          <FieldGroup className="gap-6">
            <Controller
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="full_name"
                      placeholder="Juan Dela Cruz"
                      aria-invalid={fieldState.invalid}
                      maxLength={ACCOUNT_FIELD_LIMITS.full_name}
                      tabIndex={1}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>
                        {field.value.length}/{ACCOUNT_FIELD_LIMITS.full_name}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="username"
                      placeholder="juan.delacruz"
                      aria-invalid={fieldState.invalid}
                      maxLength={ACCOUNT_FIELD_LIMITS.username}
                      tabIndex={2}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>
                        {field.value.length}/{ACCOUNT_FIELD_LIMITS.username}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                  <FieldDescription className="text-[11px] italic">
                    What should the platform call you?
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              name="bio"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bio">Bio</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      {...field}
                      id="bio"
                      placeholder="Tell us about yourself"
                      aria-invalid={fieldState.invalid}
                      maxLength={ACCOUNT_FIELD_LIMITS.bio}
                      tabIndex={3}
                      required
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="ml-auto">
                        {field.value.length}/{ACCOUNT_FIELD_LIMITS.bio}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              name="job_title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="job_title">Job Title</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="job_title"
                      placeholder="Software Engineer"
                      aria-invalid={fieldState.invalid}
                      maxLength={ACCOUNT_FIELD_LIMITS.job_title}
                      tabIndex={2}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>
                        {field.value.length}/{ACCOUNT_FIELD_LIMITS.job_title}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="phone"
                      placeholder="09123456789"
                      aria-invalid={fieldState.invalid}
                      maxLength={ACCOUNT_FIELD_LIMITS.phone}
                      tabIndex={2}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>
                        {field.value.length}/{ACCOUNT_FIELD_LIMITS.phone}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <Button type="submit" form="account-settings-form">
          <HugeiconsIcon icon={SaveIcon} className="size-4" />
          Save Changes
        </Button>
      </form>

      <Separator className="my-6" />

      <div className="rounded border border-destructive bg-destructive/10 p-4">
        <h2 className="mb-4 text-lg font-bold">Danger Zone</h2>
        <form
          id="danger-zone-form"
          onSubmit={dangerForm.handleSubmit(() => setIsConfirmOpen(true))}
        >
          <Controller
            name="disable_account"
            control={dangerForm.control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="disable_account">
                    Disable Account
                  </FieldLabel>
                  <FieldDescription>
                    I understand that disabling my account will revoke access to
                    the platform.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </FieldContent>
                <Switch
                  id="disable_account"
                  name={field.name}
                  nativeButton
                  render={<button type="button" />}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  aria-invalid={fieldState.invalid}
                />
              </Field>
            )}
          />
          <Button
            type="submit"
            variant="destructive"
            className="mt-4"
            disabled={!disableAccount}
          >
            Confirm disable account
          </Button>
        </form>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Disable account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will disable your account. Type{" "}
              <span className="font-medium text-foreground">
                {DISABLE_ACCOUNT_CONFIRMATION}
              </span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            id="disable-account-confirm-form"
            onSubmit={confirmForm.handleSubmit(() => {
              handleConfirmOpenChange(false)
              dangerForm.reset()
            })}
          >
            <FieldSet>
              <FieldGroup>
                <Controller
                  name="confirmation"
                  control={confirmForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="disable-confirmation">
                        Type &quot;{DISABLE_ACCOUNT_CONFIRMATION}&quot; to
                        confirm
                      </FieldLabel>
                      <Input
                        {...field}
                        id="disable-confirmation"
                        placeholder={DISABLE_ACCOUNT_CONFIRMATION}
                        aria-invalid={fieldState.invalid}
                        autoFocus
                        autoComplete="off"
                      />
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </FieldSet>
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              form="disable-account-confirm-form"
              variant="destructive"
              disabled={confirmation !== DISABLE_ACCOUNT_CONFIRMATION}
            >
              Disable account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
