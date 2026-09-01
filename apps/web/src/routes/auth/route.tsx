import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      {/* Dark Dot Matrix */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#000000",
          backgroundImage: `
       radial-gradient(circle at 25% 25%, #222222 1px, transparent 1px),
       radial-gradient(circle at 75% 75%, #111111 1px, transparent 1px)
     `,
          backgroundSize: "10px 10px",
          imageRendering: "pixelated",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-sm">
        <div className="mb-4 flex items-center justify-center gap-2">
          {/* <img src="/favicon.svg" alt="Tomo" className="h-8 w-8" /> */}
          {/* <span className="text-lg font-medium text-[#ffffff]">Tomo</span> */}
        </div>

        <Outlet />

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link
            to="/"
            className="text-[#ffffff] underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to="/"
            className="text-[#ffffff] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
