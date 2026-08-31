import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  ViewOffIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSignIn } from "@/hooks/use-auth"
import { type LoginInput, LoginSchema } from "@/schemas/auth-schema"
import { toast } from "@workspace/ui/components/toast"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  Card,
  CardContent,
  CardTitle,
  CardHeader,
  CardDescription,
} from "@workspace/ui/components/card"

export const Route = createFileRoute("/auth/signin")({
  component: RouteComponent,
})

function RouteComponent() {
  const signIn = useSignIn()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = (data: LoginInput) => {
    signIn.mutate(data, {
      onSuccess: () => {
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
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your existing account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="signin-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet>
            <FieldGroup>
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
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Link
                        className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                        to="/auth/reset-password"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder="Enter your password"
                        aria-invalid={fieldState.invalid}
                        tabIndex={2}
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
            </FieldGroup>
          </FieldSet>

          <Button
            type="submit"
            form="signin-form"
            disabled={signIn.isPending}
            tabIndex={3}
            className="mt-4 w-full font-semibold"
          >
            {signIn.isPending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="h-4 w-4 animate-spin"
                />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/auth/signup"
            className="text-secondary-foreground underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
