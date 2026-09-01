import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { useSignUp } from "@/hooks/use-auth"
import { RegisterSchema, type RegisterInput } from "@/schemas/auth-schema"
import { toast } from "@workspace/ui/components/toast"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"

export const Route = createFileRoute("/auth/signup")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const signUp = useSignUp()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      invitation_code: "",
    },
  })

  const onSubmit = (data: RegisterInput) => {
    signUp.mutate(data, {
      onSuccess: () => {
        toast.add({
          description: "Account created successfully",
          type: "success",
        })
        navigate({ to: "/" })
      },
      onError: (error) => {
        toast.add({
          description: error.message,
          type: "error",
        })
      },
    })
  }

  return (
    <Card className="px-4 py-6">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>
          Sign up with your invitation code to get started
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet>
            <FieldGroup>
              <Controller
                name="full_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
                    <Input
                      {...field}
                      id="full_name"
                      placeholder="Juan Dela Cruz"
                      aria-invalid={fieldState.invalid}
                      autoFocus
                      tabIndex={1}
                      required
                    />
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      aria-invalid={fieldState.invalid}
                      tabIndex={2}
                      required
                    />
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder="Enter your password"
                        aria-invalid={fieldState.invalid}
                        tabIndex={3}
                        required
                      />

                      <button
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {!showPassword ? (
                          <HugeiconsIcon
                            icon={ViewOffIcon}
                            strokeWidth={2}
                            className="h-4 w-4"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ViewIcon}
                            strokeWidth={2}
                            className="h-4 w-4"
                          />
                        )}
                      </button>
                    </div>
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="confirm_password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="confirm_password">
                      Confirm Password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder="Confirm your password"
                        aria-invalid={fieldState.invalid}
                        tabIndex={4}
                        required
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {!showConfirmPassword ? (
                          <HugeiconsIcon
                            icon={ViewOffIcon}
                            strokeWidth={2}
                            className="h-4 w-4"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ViewIcon}
                            strokeWidth={2}
                            className="h-4 w-4"
                          />
                        )}
                      </button>
                    </div>

                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="invitation_code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="invitation_code">
                      Invitation Code
                    </FieldLabel>
                    <Input
                      {...field}
                      id="invitation_code"
                      placeholder="Enter your invitation code"
                      aria-invalid={fieldState.invalid}
                      tabIndex={5}
                      required
                    />
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <Button
            type="submit"
            form="signup-form"
            disabled={signUp.isPending}
            tabIndex={6}
            className="mt-4 w-full font-semibold"
          >
            {signUp.isPending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="h-4 w-4 animate-spin"
                />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/auth/signin"
            className="text-secondary-foreground underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
