# BookLens Frontend

SvelteKit (Svelte 5) app that identifies books from cover photos. Users upload a book cover image, and the app calls a Cloudflare Worker API to extract metadata via AI vision + Google Books.

## Tech Stack

- **Framework:** SvelteKit 2 with Svelte 5 (runes)
- **Language:** TypeScript (strict)
- **Package manager:** pnpm
- **Adapter:** `@sveltejs/adapter-static` (SSG)
- **Deployment:** Cloudflare Pages

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (pair with `cd ../worker && wrangler dev`)
pnpm dev
```

Open `http://localhost:5173`. The app expects the worker running at the URL defined in `.env`.

## Environment Variables

| Variable | Purpose | Where to set |
|----------|---------|--------------|
| `PUBLIC_WORKER_URL` | Worker `/scan` endpoint | `.env` (local), CI secrets (production) |

Copy `.env.example` to `.env` for local development. The variable is injected at build time via `$env/static/public`.

## Scripts

```bash
pnpm dev        # Start dev server with HMR
pnpm build      # Production build (output: build/)
pnpm preview    # Preview production build locally
pnpm check      # TypeScript type checking
pnpm lint       # Prettier + ESLint
pnpm format     # Auto-format with Prettier
```

## Project Structure

```
src/
  app.html              # HTML shell
  app.css               # Global styles (CSS variables, reset, fonts, grain overlay)
  app.d.ts              # App type declarations
  lib/
    api/scan.ts          # Worker API client
    types/index.ts       # Shared types (BookResult, ScanResponse, AppState)
    components/
      Header.svelte      # Logo + tagline
      DropZone.svelte    # Drag-drop image upload + preview
      ButtonRow.svelte   # "Identify Book" + "Clear" buttons
      LoadingSteps.svelte # Progress bar + animated step indicators
      ResultCard.svelte  # Book metadata display with cover comparison
      ErrorBanner.svelte # Error state display
  routes/
    +layout.ts           # Prerender config (adapter-static)
    +layout.svelte       # Global layout (imports app.css, renders Header)
    +page.svelte         # Main page orchestrator (state management, scan flow)
```

## Deployment

CI/CD is handled by GitHub Actions (`.github/workflows/deploy-pages.yml`). On push to `main`:

1. Installs pnpm + Node 22
2. Runs `pnpm install --frozen-lockfile`
3. Builds with `PUBLIC_WORKER_URL` from GitHub secrets
4. Deploys `build/` to Cloudflare Pages via `wrangler-action`
