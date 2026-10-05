import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/")({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose"></div>
    </div>
  )
}
