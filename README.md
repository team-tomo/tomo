# Tomo

Vite + shadcn/ui monorepo with FastAPI and Supabase.

## Apps

- `apps/web` — React, Vite, TanStack Router + Query, shadcn (preset `b38nIqEID`)
- `apps/api` — FastAPI
- `packages/ui` — shared shadcn components
- `supabase/` — schema/migrations for the hosted project (optional CLI)

pnpm owns the JS workspace (`apps/web`, `packages/*`). uv owns the API.

## Setup

```bash
pnpm install
uv sync --directory apps/api
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Fill both `.env` files with the hosted Supabase project URL and keys from the dashboard. No local Supabase or Docker is required.

## Develop

```bash
pnpm dev          # web → http://localhost:5173
pnpm dev:api      # API  → http://localhost:8000
```

## Add UI components

From the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Import from the shared package:

```tsx
import { Button } from "@workspace/ui/components/button"
```
