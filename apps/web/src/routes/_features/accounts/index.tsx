import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_features/accounts/")({
  component: AccountsPage,
})

function AccountsPage() {
  return <div>Hello "/_features/accounts"!</div>
}
