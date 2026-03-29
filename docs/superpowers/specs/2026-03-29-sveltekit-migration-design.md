# BookLens Frontend Migration: SvelteKit + pnpm

**Date:** 2026-03-29
**Status:** Draft
**Scope:** Replace `frontend/index.html` with a SvelteKit app

---

## 1. Goals

1. **Component architecture** — break the 730-line monolith into focused, testable components
2. **Environment variables** — remove hardcoded `WORKER_URL` from source; inject via `$env/static/public` at build time
3. **TypeScript** — full type safety across the frontend
4. **Modern DX** — HMR, linting, component-scoped styles
5. **Performance** — static pre-rendering via `adapter-static`, minimal JS bundle
6. **Future-ready** — file-based routing for when new pages are added

## 2. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | SvelteKit 2 (Svelte 5) | Native interactivity, compiles to vanilla JS, no runtime |
| Package manager | pnpm | Fast, disk-efficient, native Cloudflare Pages CI support |
| Language | TypeScript (strict) | Requested; SvelteKit auto-generates types |
| Adapter | `@sveltejs/adapter-static` | Pure SSG output — identical deployment model to today |
| Styling | Component-scoped `<style>` | Matches Svelte's model; migrate existing CSS variables |
| Linting | ESLint + Prettier + eslint-plugin-svelte | Standard SvelteKit setup via `sv create` |

## 3. Architecture

### 3.1 Directory Structure

```
frontend/
  package.json
  pnpm-lock.yaml
  svelte.config.js
  vite.config.ts
  tsconfig.json
  .env.example              # PUBLIC_WORKER_URL=https://your-worker.workers.dev/scan
  .env                      # gitignored, actual value
  static/
    favicon.svg             # (if needed)
  src/
    app.html                # HTML shell (replaces <!DOCTYPE> boilerplate)
    app.css                 # Global CSS: reset, CSS custom properties, fonts, grain overlay
    lib/
      components/
        Header.svelte       # Logo + tagline
        DropZone.svelte     # Drag-drop upload area + image preview
        ButtonRow.svelte    # "Identify Book" + "Clear" buttons
        LoadingSteps.svelte # Progress bar + step indicators
        ResultCard.svelte   # Book metadata display (header, meta grid, description, cover compare)
        ErrorBanner.svelte  # Error state display
      types/
        index.ts            # Shared types: BookResult, AppState, ScanResponse
      api/
        scan.ts             # fetch() call to worker, typed request/response
    routes/
      +layout.svelte        # Global layout: imports app.css, renders Header + <slot>
      +page.svelte          # Main page: orchestrates DropZone, ButtonRow, result states
```

### 3.2 Component Breakdown

**`+page.svelte`** — the orchestrator. Owns the top-level state:

```ts
type AppState = 'empty' | 'loading' | 'result' | 'error';

let state = $state<AppState>('empty');
let imageBase64 = $state<string | null>(null);
let previewUrl = $state<string | null>(null);
let result = $state<BookResult | null>(null);
let error = $state<string | null>(null);
```

Each child component receives props/callbacks — no shared stores needed.

**`DropZone.svelte`** — handles drag-drop, file input click, FileReader, preview display. Emits `onfile(base64, previewUrl)` callback.

**`ButtonRow.svelte`** — "Identify Book" (disabled until image loaded) + "Clear". Emits `onscan()` and `onclear()`.

**`LoadingSteps.svelte`** — animated progress bar + 4 step indicators with timed transitions. Receives `active: boolean` prop.

**`ResultCard.svelte`** — receives `BookResult` prop. Renders header with confidence badge, cover comparison, meta grid, description, Google Books link, and "Scan another" button (mobile).

**`ErrorBanner.svelte`** — receives `message: string` prop.

### 3.3 Types

```ts
// src/lib/types/index.ts

export interface BookResult {
  title: string;
  author: string;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  categories: string | null;
  description: string | null;
  infoLink: string | null;
  thumbnail: string | null;
}

export interface ScanResponse extends BookResult {
  error?: string;
  debug?: Record<string, unknown>;
}

export type AppState = 'empty' | 'loading' | 'result' | 'error';
```

### 3.4 API Module

```ts
// src/lib/api/scan.ts
import { PUBLIC_WORKER_URL } from '$env/static/public';
import type { ScanResponse } from '$lib/types';

export async function scanBookCover(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(PUBLIC_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  const data: ScanResponse = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
```

### 3.5 Environment Variables

| Variable | Module | Purpose |
|---|---|---|
| `PUBLIC_WORKER_URL` | `$env/static/public` | Worker scan endpoint, replaced at build time |

- `.env` file (gitignored) for local dev: `PUBLIC_WORKER_URL=http://localhost:8787/scan`
- `.env.example` committed with placeholder value
- CI/CD: set `PUBLIC_WORKER_URL` in Cloudflare Pages build settings or GitHub Actions secrets

## 4. Styling Strategy

- **Global styles** in `src/app.css`: CSS reset, `:root` custom properties (all the existing `--cream`, `--ink`, `--rust`, etc.), font imports, body styles, grain overlay
- **Component-scoped styles** in each `.svelte` file's `<style>` block: move relevant CSS from the monolith into the component that uses it
- No CSS framework — the existing design is clean and custom; keep it

## 5. Deployment Changes

### 5.1 Build Output

`adapter-static` outputs to `frontend/build/` (configurable). The output is plain HTML/CSS/JS — same as what Cloudflare Pages serves today.

### 5.2 CI/CD Update (`deploy-pages.yml`)

The workflow needs to:
1. Install pnpm
2. Install dependencies
3. Build the SvelteKit app
4. Deploy the `build/` output directory

```yaml
# Key changes:
- uses: pnpm/action-setup@v4
- run: pnpm install --frozen-lockfile
- run: pnpm build
  env:
    PUBLIC_WORKER_URL: ${{ secrets.PUBLIC_WORKER_URL }}
- uses: cloudflare/wrangler-action@v3
  with:
    command: pages deploy frontend/build --project-name=booklens
```

### 5.3 Local Development

```bash
cd frontend
pnpm dev          # starts Vite dev server with HMR on localhost:5173
```

Worker URL defaults to `http://localhost:8787/scan` from `.env` for local dev (pair with `cd worker && wrangler dev`).

## 6. Migration Strategy

**Approach: rewrite in place.** The current `frontend/index.html` is a single file with no dependencies. Rather than incrementally migrating, scaffold SvelteKit into `frontend/`, port the HTML/CSS/JS into components, and delete the old file. The visual result should be pixel-identical.

**Verification:** Compare screenshots of old vs new. All interactions (drag-drop, file select, scan, clear, error) must work identically.

## 7. What's NOT Changing

- **Worker (`worker/worker.js`)** — untouched, separate deployment
- **Worker deployment workflow** — untouched
- **Visual design** — pixel-identical port of existing CSS/HTML
- **Functionality** — identical feature set, no additions
- **CORS setup** — worker already allows `*`

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Build step adds complexity | One-time setup; pnpm scripts abstract it |
| SvelteKit overhead for single page | `adapter-static` strips it to plain HTML; routing overhead is negligible |
| CSS regression during port | Manual visual comparison; keep all CSS variables identical |
| Svelte 5 runes learning curve | Simple state — only `$state` and basic event handlers needed |
