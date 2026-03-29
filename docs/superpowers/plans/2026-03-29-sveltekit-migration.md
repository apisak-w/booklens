# SvelteKit Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `frontend/index.html` with a SvelteKit app using TypeScript, pnpm, and adapter-static, deployed to Cloudflare Pages.

**Architecture:** SvelteKit with adapter-static for pure SSG output. Components split by UI responsibility. Environment variable via `$env/static/public`. Pixel-identical visual result.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript (strict), pnpm, `@sveltejs/adapter-static`, Vite

**Spec:** `docs/superpowers/specs/2026-03-29-sveltekit-migration-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/package.json` | Dependencies, scripts |
| Create | `frontend/pnpm-lock.yaml` | Lock file (generated) |
| Create | `frontend/svelte.config.js` | SvelteKit + adapter-static config |
| Create | `frontend/vite.config.ts` | Vite config with SvelteKit plugin |
| Create | `frontend/tsconfig.json` | TypeScript config |
| Create | `frontend/.env.example` | Env var template (committed) |
| Create | `frontend/.env` | Actual env values (gitignored) |
| Create | `frontend/.gitignore` | Node/SvelteKit ignores |
| Create | `frontend/.prettierrc` | Prettier config |
| Create | `frontend/.prettierignore` | Prettier ignore |
| Create | `frontend/eslint.config.js` | ESLint config |
| Create | `frontend/src/app.html` | HTML shell |
| Create | `frontend/src/app.css` | Global styles (reset, CSS vars, fonts, grain) |
| Create | `frontend/src/app.d.ts` | App type declarations |
| Create | `frontend/src/lib/types/index.ts` | Shared types |
| Create | `frontend/src/lib/api/scan.ts` | Worker API client |
| Create | `frontend/src/lib/components/Header.svelte` | Logo + tagline |
| Create | `frontend/src/lib/components/DropZone.svelte` | Drag-drop + preview |
| Create | `frontend/src/lib/components/ButtonRow.svelte` | Action buttons |
| Create | `frontend/src/lib/components/LoadingSteps.svelte` | Progress bar + steps |
| Create | `frontend/src/lib/components/ResultCard.svelte` | Book result display |
| Create | `frontend/src/lib/components/ErrorBanner.svelte` | Error display |
| Create | `frontend/src/routes/+layout.svelte` | Global layout |
| Create | `frontend/src/routes/+layout.ts` | Prerender config |
| Create | `frontend/src/routes/+page.svelte` | Main page orchestrator |
| Modify | `frontend/.gitignore` | Add SvelteKit/Node entries |
| Modify | `.github/workflows/deploy-pages.yml` | Add pnpm install + build step |
| Delete | `frontend/index.html` | Replaced by SvelteKit app |

---

### Task 1: Create Branch and Scaffold SvelteKit Project

**Files:**
- Create: `frontend/package.json`, `frontend/svelte.config.js`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/.gitignore`, `frontend/.prettierrc`, `frontend/.prettierignore`, `frontend/eslint.config.js`, `frontend/src/app.html`, `frontend/src/app.d.ts`, `frontend/src/routes/+layout.svelte`, `frontend/src/routes/+page.svelte`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/first/Documents/Development/booklens
git checkout main
git pull
git checkout -b feat/sveltekit-migration
```

- [ ] **Step 2: Back up the existing index.html**

Rename so it's preserved during scaffolding — we'll reference it throughout the migration:

```bash
mv frontend/index.html frontend/index.html.bak
```

- [ ] **Step 3: Scaffold SvelteKit into frontend/**

```bash
pnpm dlx sv create frontend --template minimal --types ts --add prettier eslint "sveltekit-adapter=adapter:static" --install pnpm --no-add-ons
```

> **Note:** If `sv create` refuses to scaffold into an existing non-empty directory (due to `index.html.bak`), temporarily move the backup out:
> ```bash
> mv frontend/index.html.bak ./index.html.bak
> pnpm dlx sv create frontend --template minimal --types ts --add prettier eslint "sveltekit-adapter=adapter:static" --install pnpm
> mv ./index.html.bak frontend/index.html.bak
> ```

- [ ] **Step 4: Verify the scaffold works**

```bash
cd frontend && pnpm dev --open
```

Expected: Browser opens to `localhost:5173` showing the default SvelteKit skeleton page. Press Ctrl+C to stop.

- [ ] **Step 5: Verify the build works**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm build
```

Expected: Build succeeds. Output in `frontend/build/` directory. You should see `build/index.html` and `build/_app/` directory.

- [ ] **Step 6: Commit scaffold**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): scaffold SvelteKit project with adapter-static

Replaces the single index.html with a SvelteKit skeleton.
Uses TypeScript, pnpm, ESLint, Prettier, and adapter-static for SSG.
EOF
)"
```

---

### Task 2: Configure Environment Variables

**Files:**
- Create: `frontend/.env.example`
- Create: `frontend/.env`
- Verify: `frontend/.gitignore` (should already ignore `.env`)

- [ ] **Step 1: Create `.env.example` (committed to git)**

Create `frontend/.env.example`:

```
# Worker scan endpoint
# Local dev: http://localhost:8787/scan
# Production: set via CI/CD build environment variables
PUBLIC_WORKER_URL=http://localhost:8787/scan
```

- [ ] **Step 2: Create `.env` for local development (gitignored)**

Create `frontend/.env`:

```
PUBLIC_WORKER_URL=http://localhost:8787/scan
```

- [ ] **Step 3: Verify `.gitignore` ignores `.env`**

```bash
cd /Users/first/Documents/Development/booklens/frontend
grep '\.env' .gitignore
```

Expected output should include `.env` and `.env.*` (but not `.env.example`). The SvelteKit scaffold `.gitignore` already handles this. If not, add:

```
.env
.env.*
!.env.example
```

- [ ] **Step 4: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/.env.example
git commit -m "$(cat <<'EOF'
chore(frontend): add env var template for worker URL

PUBLIC_WORKER_URL is injected at build time via $env/static/public.
Actual .env is gitignored; .env.example committed as reference.
EOF
)"
```

---

### Task 3: Types and API Module

**Files:**
- Create: `frontend/src/lib/types/index.ts`
- Create: `frontend/src/lib/api/scan.ts`

- [ ] **Step 1: Create shared types**

Create `frontend/src/lib/types/index.ts`:

```ts
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

- [ ] **Step 2: Create API module**

Create `frontend/src/lib/api/scan.ts`:

```ts
import { PUBLIC_WORKER_URL } from '$env/static/public';
import type { ScanResponse } from '$lib/types';

export async function scanBookCover(imageBase64: string): Promise<ScanResponse> {
	const res = await fetch(PUBLIC_WORKER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ imageBase64 })
	});

	const data: ScanResponse = await res.json();

	if (data.error) {
		throw new Error(data.error);
	}

	return data;
}
```

- [ ] **Step 3: Type check**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/types/index.ts frontend/src/lib/api/scan.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add types and API module for worker communication

BookResult/ScanResponse types match the worker's JSON response shape.
scanBookCover() uses PUBLIC_WORKER_URL from $env/static/public.
EOF
)"
```

---

### Task 4: Global Styles and App Shell

**Files:**
- Create: `frontend/src/app.css`
- Modify: `frontend/src/app.html`

Reference: `frontend/index.html.bak` lines 1-101, lines 472-473 (the `<style>` block and HTML shell).

- [ ] **Step 1: Create global stylesheet**

Create `frontend/src/app.css` with the global styles extracted from `index.html.bak`. This includes: CSS reset, `:root` custom properties, body styles, grain overlay, header styles, main grid + responsive breakpoints, and shared button base styles.

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

*,
*::before,
*::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

:root {
	--cream: #f5f0e8;
	--ink: #1a1612;
	--rust: #c4622d;
	--rust-light: #e8845a;
	--sage: #4a5e4f;
	--gold: #c9a84c;
	--paper: #ede8dc;
	--muted: #7a7060;
	--border: rgba(26, 22, 18, 0.12);
}

body {
	background: var(--cream);
	color: var(--ink);
	font-family: 'DM Sans', sans-serif;
	font-weight: 300;
	min-height: 100vh;
	overflow-x: hidden;
}

/* Grain overlay */
body::before {
	content: '';
	position: fixed;
	inset: 0;
	background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
	pointer-events: none;
	z-index: 9999;
	opacity: 0.5;
}

/* Shared button base */
.btn {
	flex: 1;
	padding: 0.65rem 1rem;
	border-radius: 3px;
	font-family: 'DM Sans', sans-serif;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s;
	letter-spacing: 0.01em;
	border: none;
}

.btn-primary {
	background: var(--rust);
	color: #fff;
}

.btn-primary:hover {
	background: #b5562a;
}

.btn-primary:disabled {
	background: var(--muted);
	cursor: not-allowed;
	opacity: 0.6;
}

.btn-secondary {
	background: transparent;
	color: var(--ink);
	border: 1px solid var(--border);
}

.btn-secondary:hover {
	background: var(--paper);
}
```

- [ ] **Step 2: Update `app.html`**

Replace `frontend/src/app.html` with:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>BookLens — Scan Any Book Cover</title>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

- [ ] **Step 3: Verify dev server renders correctly**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm dev
```

Expected: Page loads at `localhost:5173` with cream background, grain overlay, and correct fonts loading. Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/app.css frontend/src/app.html
git commit -m "$(cat <<'EOF'
feat(frontend): add global styles and app shell

Extracts CSS variables, reset, fonts, grain overlay, and button base
styles from index.html into app.css. Updates app.html with page title.
EOF
)"
```

---

### Task 5: Header Component

**Files:**
- Create: `frontend/src/lib/components/Header.svelte`

Reference: `frontend/index.html.bak` lines 476-479 (header HTML), lines 43-75 (header CSS).

- [ ] **Step 1: Create Header component**

Create `frontend/src/lib/components/Header.svelte`:

```svelte
<header>
	<div class="logo">Book<span>Lens</span></div>
	<div class="tagline">Cover recognition</div>
</header>

<style>
	header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: 1.25rem 3rem;
		display: flex;
		align-items: baseline;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--cream);
	}

	.logo {
		font-family: 'Playfair Display', serif;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--ink);
	}

	.logo span {
		color: var(--rust);
	}

	.tagline {
		font-size: 0.8rem;
		color: var(--muted);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 400;
	}

	@media (max-width: 680px) {
		header {
			padding: 1rem 1.25rem;
		}
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/Header.svelte
git commit -m "feat(frontend): add Header component"
```

---

### Task 6: DropZone Component

**Files:**
- Create: `frontend/src/lib/components/DropZone.svelte`

Reference: `frontend/index.html.bak` lines 484-498 (HTML), lines 103-163 (CSS), lines 580-641 (JS: drag-drop, file loading, preview).

- [ ] **Step 1: Create DropZone component**

Create `frontend/src/lib/components/DropZone.svelte`:

```svelte
<script lang="ts">
	interface Props {
		previewUrl: string | null;
		onfile: (base64: string, previewUrl: string) => void;
	}

	let { previewUrl, onfile }: Props = $props();

	let dropZoneEl: HTMLDivElement;
	let fileInputEl: HTMLInputElement;
	let dragover = $state(false);

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragover = false;
		const file = e.dataTransfer?.files[0];
		if (file && file.type.startsWith('image/')) loadFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragover = true;
	}

	function handleFileChange() {
		const file = fileInputEl?.files?.[0];
		if (file) loadFile(file);
	}

	function loadFile(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			const base64 = dataUrl.split(',')[1];
			onfile(base64, dataUrl);
		};
		reader.readAsDataURL(file);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="drop-zone"
	class:dragover
	class:has-preview={previewUrl !== null}
	bind:this={dropZoneEl}
	onclick={() => fileInputEl.click()}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={() => (dragover = false)}
>
	{#if previewUrl}
		<img class="preview" src={previewUrl} alt="Book cover preview" />
	{/if}
	{#if !previewUrl}
		<div class="drop-icon">
			<svg viewBox="0 0 24 24"
				><path d="M4 16l4-4 4 4 4-6 4 6" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg
			>
		</div>
		<div class="drop-text">
			<strong>Drop a book cover here</strong><br />
			or click to browse
		</div>
	{/if}
</div>
<input
	type="file"
	accept="image/*"
	bind:this={fileInputEl}
	onchange={handleFileChange}
	style="display:none"
/>

<style>
	.drop-zone {
		border: 1.5px dashed var(--border);
		border-radius: 4px;
		background: var(--paper);
		aspect-ratio: 3/4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		cursor: pointer;
		transition:
			border-color 0.2s,
			background 0.2s;
		overflow: hidden;
		position: relative;
	}

	.drop-zone:hover {
		border-color: var(--rust);
		background: #eae5d9;
	}

	.drop-zone.dragover {
		border-color: var(--rust);
		background: #f0ebe0;
		border-style: solid;
	}

	.preview {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.drop-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(196, 98, 45, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.drop-zone:hover .drop-icon {
		background: rgba(196, 98, 45, 0.18);
	}

	.drop-icon svg {
		width: 22px;
		height: 22px;
		stroke: var(--rust);
		fill: none;
		stroke-width: 1.5;
	}

	.drop-text {
		text-align: center;
		font-size: 0.875rem;
		color: var(--muted);
		line-height: 1.5;
	}

	.drop-text strong {
		color: var(--rust);
		font-weight: 500;
	}

	@media (max-width: 680px) {
		.drop-zone {
			aspect-ratio: auto;
			max-height: 40vh;
			min-height: 200px;
			width: 100%;
		}

		.preview {
			position: relative;
			inset: auto;
			max-height: 40vh;
			object-fit: contain;
		}
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/DropZone.svelte
git commit -m "feat(frontend): add DropZone component with drag-drop and file upload"
```

---

### Task 7: ButtonRow Component

**Files:**
- Create: `frontend/src/lib/components/ButtonRow.svelte`

Reference: `frontend/index.html.bak` lines 494-497 (HTML), lines 165-201 (CSS).

- [ ] **Step 1: Create ButtonRow component**

Create `frontend/src/lib/components/ButtonRow.svelte`:

```svelte
<script lang="ts">
	interface Props {
		scanDisabled: boolean;
		onscan: () => void;
		onclear: () => void;
	}

	let { scanDisabled, onscan, onclear }: Props = $props();
</script>

<div class="btn-row">
	<button class="btn btn-primary" disabled={scanDisabled} onclick={onscan}>Identify Book</button>
	<button class="btn btn-secondary" onclick={onclear}>Clear</button>
</div>

<style>
	.btn-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/ButtonRow.svelte
git commit -m "feat(frontend): add ButtonRow component"
```

---

### Task 8: LoadingSteps Component

**Files:**
- Create: `frontend/src/lib/components/LoadingSteps.svelte`

Reference: `frontend/index.html.bak` lines 508-515 (HTML), lines 226-281 (CSS), lines 656-672 (JS: step animation + loading bar).

- [ ] **Step 1: Create LoadingSteps component**

Create `frontend/src/lib/components/LoadingSteps.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		active: boolean;
	}

	let { active }: Props = $props();

	const steps = [
		'Analysing cover image…',
		'Extracting title & author…',
		'Fetching from Google Books…',
		'Compiling result…'
	];

	const delays = [0, 800, 1800, 2800];

	let currentStep = $state(-1);
	let barKey = $state(0);
	let timeouts: ReturnType<typeof setTimeout>[] = [];

	$effect(() => {
		// Clear previous timeouts
		timeouts.forEach(clearTimeout);
		timeouts = [];

		if (active) {
			currentStep = -1;
			barKey++;
			delays.forEach((delay, i) => {
				const t = setTimeout(() => {
					currentStep = i;
				}, delay);
				timeouts.push(t);
			});
		} else {
			currentStep = -1;
		}
	});
</script>

{#if active}
	<div class="state-loading">
		<div class="loading-bar">
			{#key barKey}
				<div class="loading-bar-inner"></div>
			{/key}
		</div>
		<div class="loading-steps">
			{#each steps as step, i}
				<div class="step" class:active={currentStep === i} class:done={currentStep > i}>
					<div class="step-dot"></div>
					{step}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.state-loading {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem 0;
	}

	.loading-bar {
		height: 3px;
		background: var(--paper);
		border-radius: 99px;
		overflow: hidden;
	}

	.loading-bar-inner {
		height: 100%;
		background: linear-gradient(90deg, var(--rust), var(--gold));
		width: 0%;
		animation: barfill 3s ease-in-out forwards;
		border-radius: 99px;
	}

	@keyframes barfill {
		0% {
			width: 0%;
		}
		40% {
			width: 55%;
		}
		70% {
			width: 78%;
		}
		90% {
			width: 90%;
		}
		100% {
			width: 95%;
		}
	}

	.loading-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: var(--muted);
		opacity: 0;
		transform: translateY(4px);
		transition:
			opacity 0.3s,
			transform 0.3s;
	}

	.step.active {
		opacity: 1;
		transform: translateY(0);
		color: var(--ink);
	}

	.step.done {
		opacity: 0.45;
		transform: translateY(0);
	}

	.step-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--border);
		flex-shrink: 0;
		transition: background 0.3s;
	}

	.step.active .step-dot {
		background: var(--rust);
	}

	.step.done .step-dot {
		background: var(--sage);
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/LoadingSteps.svelte
git commit -m "feat(frontend): add LoadingSteps component with animated progress"
```

---

### Task 9: ResultCard Component

**Files:**
- Create: `frontend/src/lib/components/ResultCard.svelte`

Reference: `frontend/index.html.bak` lines 518-571 (HTML), lines 283-458 (CSS), lines 685-711 (JS: fill result).

- [ ] **Step 1: Create ResultCard component**

Create `frontend/src/lib/components/ResultCard.svelte`:

```svelte
<script lang="ts">
	import type { BookResult } from '$lib/types';

	interface Props {
		result: BookResult;
		userImageUrl: string | null;
		onscanother: () => void;
	}

	let { result, userImageUrl, onscanother }: Props = $props();

	let authorDisplay = $derived(result.author ? `by ${result.author}` : '');
	let yearDisplay = $derived(result.publishedDate ? result.publishedDate.slice(0, 4) : '—');
	let pagesDisplay = $derived(result.pageCount ? `${result.pageCount} pp.` : '—');
	let descriptionDisplay = $derived(
		result.description
			? result.description.slice(0, 280) + (result.description.length > 280 ? '…' : '')
			: 'No description available.'
	);
</script>

<div class="result-card">
	<div class="result-header">
		<span class="result-label">Book identified</span>
		<span class="confidence-badge">HIGH MATCH</span>
	</div>
	<div class="result-body">
		<!-- Mobile: cover + title row (hidden on desktop via +page.svelte responsive) -->
		<div class="result-cover-row">
			<img src={result.thumbnail ?? userImageUrl ?? ''} alt="Book cover" />
			<div class="result-cover-info">
				<div class="book-title">{result.title}</div>
				<div class="book-author">{authorDisplay}</div>
			</div>
		</div>

		<!-- Desktop: title + author -->
		<div class="book-title desktop-only">{result.title}</div>
		<div class="book-author desktop-only">{authorDisplay}</div>

		<!-- Cover comparison -->
		{#if result.thumbnail && userImageUrl}
			<div class="cover-compare">
				<div class="cover-compare-item">
					<img src={userImageUrl} alt="Your photo" />
					<div class="cover-compare-label">Your photo</div>
				</div>
				<div class="cover-compare-item">
					<img src={result.thumbnail} alt="Google Books cover" />
					<div class="cover-compare-label">Google Books</div>
				</div>
			</div>
		{/if}

		<hr class="divider-line" />

		<div class="meta-grid">
			<div class="meta-item">
				<label>Publisher</label>
				<div class="val">{result.publisher ?? '—'}</div>
			</div>
			<div class="meta-item">
				<label>Published</label>
				<div class="val">{yearDisplay}</div>
			</div>
			<div class="meta-item">
				<label>Pages</label>
				<div class="val">{pagesDisplay}</div>
			</div>
			<div class="meta-item">
				<label>Category</label>
				<div class="val">{result.categories ?? '—'}</div>
			</div>
		</div>

		<div class="description-section">
			<label>Description</label>
			<div class="description-text">{descriptionDisplay}</div>
		</div>

		{#if result.infoLink}
			<a href={result.infoLink} target="_blank" rel="noopener noreferrer" class="google-books-link">
				View on Google Books
				<svg viewBox="0 0 24 24"
					><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline
						points="15 3 21 3 21 9"
					/><line x1="10" y1="14" x2="21" y2="3" /></svg
				>
			</a>
		{/if}

		<button class="btn-scan-another" onclick={onscanother}>Scan another book</button>
	</div>
</div>

<style>
	.result-card {
		background: var(--paper);
		border: 1px solid var(--border);
		border-radius: 4px;
		overflow: hidden;
		animation: slideUp 0.4s ease forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.result-header {
		background: var(--ink);
		color: var(--cream);
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.result-label {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(245, 240, 232, 0.5);
		font-family: 'DM Mono', monospace;
	}

	.confidence-badge {
		font-size: 0.7rem;
		font-family: 'DM Mono', monospace;
		padding: 0.2rem 0.6rem;
		border-radius: 2px;
		background: rgba(201, 168, 76, 0.2);
		color: var(--gold);
		letter-spacing: 0.05em;
	}

	.result-body {
		padding: 1.5rem 1.25rem;
	}

	.result-cover-row {
		display: none;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.result-cover-row .result-cover-info {
		flex: 1;
		min-width: 0;
	}

	.result-cover-row img {
		width: 70px;
		height: 95px;
		object-fit: cover;
		border-radius: 3px;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}

	.book-title {
		font-family: 'Playfair Display', serif;
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.2;
		margin-bottom: 0.4rem;
		color: var(--ink);
	}

	.book-author {
		font-size: 0.95rem;
		color: var(--rust);
		margin-bottom: 1.25rem;
		font-weight: 400;
	}

	.cover-compare {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.cover-compare-item {
		flex: 1;
		text-align: center;
	}

	.cover-compare-item img {
		width: 100%;
		max-height: 200px;
		object-fit: contain;
		border-radius: 3px;
		border: 1px solid var(--border);
	}

	.cover-compare-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		margin-top: 0.4rem;
	}

	.divider-line {
		border: none;
		border-top: 1px solid var(--border);
		margin: 1.25rem 0;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.meta-item label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		display: block;
		margin-bottom: 0.25rem;
	}

	.meta-item .val {
		font-size: 0.9rem;
		color: var(--ink);
		font-weight: 400;
	}

	.description-section {
		margin-top: 1.25rem;
	}

	.description-section label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		display: block;
		margin-bottom: 0.5rem;
	}

	.description-text {
		font-size: 0.875rem;
		line-height: 1.65;
		color: var(--ink);
		opacity: 0.8;
	}

	.google-books-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1.25rem;
		font-size: 0.8rem;
		color: var(--rust);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.15s;
	}

	.google-books-link:hover {
		color: #b5562a;
	}

	.google-books-link svg {
		width: 14px;
		height: 14px;
		stroke: currentColor;
		fill: none;
		stroke-width: 2;
	}

	.btn-scan-another {
		display: none;
		width: 100%;
		padding: 0.65rem 1rem;
		margin-top: 1rem;
		border-radius: 3px;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--ink);
		transition: all 0.15s;
	}

	.btn-scan-another:hover {
		background: var(--paper);
	}

	@media (max-width: 680px) {
		.result-cover-row {
			display: flex;
		}

		.desktop-only {
			display: none;
		}

		.btn-scan-another {
			display: block;
		}
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/ResultCard.svelte
git commit -m "feat(frontend): add ResultCard component with book metadata display"
```

---

### Task 10: ErrorBanner Component

**Files:**
- Create: `frontend/src/lib/components/ErrorBanner.svelte`

Reference: `frontend/index.html.bak` lines 461-471 (CSS).

- [ ] **Step 1: Create ErrorBanner component**

Create `frontend/src/lib/components/ErrorBanner.svelte`:

```svelte
<script lang="ts">
	interface Props {
		message: string;
	}

	let { message }: Props = $props();
</script>

<div class="state-error">{message}</div>

<style>
	.state-error {
		background: #fef2ee;
		border: 1px solid rgba(196, 98, 45, 0.2);
		border-radius: 4px;
		padding: 1.25rem;
		font-size: 0.875rem;
		color: var(--rust);
		line-height: 1.6;
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/lib/components/ErrorBanner.svelte
git commit -m "feat(frontend): add ErrorBanner component"
```

---

### Task 11: Layout and Page Route

**Files:**
- Modify: `frontend/src/routes/+layout.svelte`
- Create: `frontend/src/routes/+layout.ts`
- Modify: `frontend/src/routes/+page.svelte`

Reference: `frontend/index.html.bak` lines 77-100 (main grid CSS), lines 580-725 (JS: state management, scan flow).

- [ ] **Step 1: Create `+layout.ts` for prerendering**

Create `frontend/src/routes/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 2: Update `+layout.svelte`**

Replace `frontend/src/routes/+layout.svelte` with:

```svelte
<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<Header />
{@render children()}
```

- [ ] **Step 3: Create `+page.svelte` (main orchestrator)**

Replace `frontend/src/routes/+page.svelte` with:

```svelte
<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import ButtonRow from '$lib/components/ButtonRow.svelte';
	import LoadingSteps from '$lib/components/LoadingSteps.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { scanBookCover } from '$lib/api/scan';
	import type { AppState, BookResult } from '$lib/types';

	let state = $state<AppState>('empty');
	let imageBase64 = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);
	let result = $state<BookResult | null>(null);
	let errorMessage = $state<string>('');
	let hasResult = $derived(state === 'result');

	function handleFile(base64: string, preview: string) {
		imageBase64 = base64;
		previewUrl = preview;
		state = 'empty';
	}

	function handleClear() {
		imageBase64 = null;
		previewUrl = null;
		result = null;
		errorMessage = '';
		state = 'empty';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function handleScan() {
		if (!imageBase64) return;
		state = 'loading';

		try {
			result = await scanBookCover(imageBase64);
			// Small delay to let the last loading step animate
			setTimeout(() => {
				state = 'result';
			}, 400);
		} catch (err) {
			errorMessage =
				'Could not identify this book. ' +
				((err as Error).message || 'Please try a clearer image.');
			state = 'error';
		}
	}
</script>

<main class:has-result={hasResult}>
	<div class="upload-panel">
		<DropZone {previewUrl} onfile={handleFile} />
		<ButtonRow scanDisabled={imageBase64 === null} onscan={handleScan} onclear={handleClear} />
	</div>

	<div class="result-panel">
		{#if state === 'empty'}
			<div class="state-empty">
				<div class="big-num">01</div>
				<p>
					Upload a photo of any book cover. BookLens will identify the title, author, and pull
					metadata from Google Books.
				</p>
			</div>
		{/if}

		<LoadingSteps active={state === 'loading'} />

		{#if state === 'result' && result}
			<ResultCard {result} userImageUrl={previewUrl} onscanother={handleClear} />
		{/if}

		{#if state === 'error'}
			<ErrorBanner message={errorMessage} />
		{/if}
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 5rem 2rem 3rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem;
		align-items: start;
	}

	.upload-panel {
		position: sticky;
		top: 2rem;
	}

	.result-panel {
		min-height: 300px;
	}

	.state-empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem 0;
		color: var(--muted);
	}

	.state-empty .big-num {
		font-family: 'Playfair Display', serif;
		font-size: 4rem;
		color: rgba(26, 22, 18, 0.07);
		line-height: 1;
	}

	.state-empty p {
		font-size: 0.9rem;
		line-height: 1.6;
		max-width: 280px;
	}

	@media (max-width: 680px) {
		main {
			grid-template-columns: 1fr;
			padding: 5.5rem 1.25rem 2rem;
			gap: 1rem;
		}

		.upload-panel {
			position: static;
			width: 100%;
		}

		.state-empty {
			display: none;
		}

		main.has-result .upload-panel {
			display: none;
		}
	}
</style>
```

- [ ] **Step 4: Type check**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add frontend/src/routes/
git commit -m "$(cat <<'EOF'
feat(frontend): add layout and main page with scan orchestration

+layout.svelte renders Header and global styles.
+layout.ts enables prerendering for adapter-static.
+page.svelte orchestrates the full scan flow: upload, loading, result, error.
EOF
)"
```

---

### Task 12: Build Verification and Cleanup

**Files:**
- Delete: `frontend/index.html.bak`

- [ ] **Step 1: Run full build**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm build
```

Expected: Build succeeds. `frontend/build/` contains `index.html` and `_app/` with JS/CSS assets.

- [ ] **Step 2: Preview the built site**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm preview
```

Expected: Opens at `localhost:4173`. Visually verify:
- Header with "BookLens" logo and tagline
- Drop zone with dashed border and upload prompt
- "Identify Book" button (disabled) and "Clear" button
- Cream background with grain overlay
- Responsive layout on narrow viewport

Press Ctrl+C to stop.

- [ ] **Step 3: Run lint and format**

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm lint
pnpm format
```

Fix any lint or formatting issues.

- [ ] **Step 4: Delete the backup file**

```bash
rm /Users/first/Documents/Development/booklens/frontend/index.html.bak
```

- [ ] **Step 5: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add -A frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): remove old index.html, verify build output

Build produces static HTML/CSS/JS via adapter-static.
All components render correctly in preview.
EOF
)"
```

---

### Task 13: Update CI/CD Workflow

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Update the deploy workflow**

Replace `.github/workflows/deploy-pages.yml` with:

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]
    paths:
      - frontend/**
      - .github/workflows/deploy-pages.yml
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: frontend
        run: pnpm build
        env:
          PUBLIC_WORKER_URL: ${{ secrets.PUBLIC_WORKER_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy frontend/build --project-name=booklens
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add .github/workflows/deploy-pages.yml
git commit -m "$(cat <<'EOF'
ci: update deploy-pages for SvelteKit build pipeline

Adds pnpm install, Node 22 setup, and vite build step.
PUBLIC_WORKER_URL injected from GitHub secrets at build time.
Deploys frontend/build/ instead of frontend/ directly.
EOF
)"
```

---

### Task 14: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the development commands and key details**

Update the `Development Commands` section in `CLAUDE.md` to reflect the new frontend workflow:

Replace the existing `Development Commands` section with:

````markdown
## Development Commands

```bash
# Frontend local dev
cd frontend && pnpm dev

# Frontend build
cd frontend && pnpm build

# Frontend preview built site
cd frontend && pnpm preview

# Frontend lint + format
cd frontend && pnpm lint
cd frontend && pnpm format

# Frontend type check
cd frontend && pnpm check

# Worker local dev
cd worker && wrangler dev

# Deploy worker
cd worker && wrangler deploy

# Deploy frontend to Pages (CI handles this; manual if needed)
cd frontend && pnpm build && cd .. && wrangler pages deploy frontend/build --project-name=booklens

# Manage worker secrets
wrangler secret put GOOGLE_BOOKS_API_KEY --config worker/wrangler.toml
```
````

Update the `Key Details` section — replace the line:
```
- No build step, bundler, or package manager — both components are single files.
```
with:
```
- Frontend uses SvelteKit (Svelte 5) with pnpm, built via Vite, output to `frontend/build/`.
- Worker has no build step — single file (`worker.js`).
```

- [ ] **Step 2: Commit**

```bash
cd /Users/first/Documents/Development/booklens
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for SvelteKit frontend workflow"
```

---

### Task 15: End-to-End Smoke Test

No new files. This is a manual verification task.

- [ ] **Step 1: Start the worker locally**

In one terminal:

```bash
cd /Users/first/Documents/Development/booklens/worker
wrangler dev
```

Expected: Worker running at `http://localhost:8787`.

- [ ] **Step 2: Start the frontend locally**

In another terminal:

```bash
cd /Users/first/Documents/Development/booklens/frontend
pnpm dev
```

Expected: Frontend running at `http://localhost:5173`.

- [ ] **Step 3: Test the full flow**

In the browser at `localhost:5173`:

1. Verify cream background, grain overlay, header with "BookLens" logo
2. Click drop zone — file picker opens
3. Select a book cover image — preview appears in drop zone
4. Click "Identify Book" — loading animation plays (progress bar + steps)
5. Result card appears with book title, author, metadata, cover comparison
6. Click "Clear" — resets to initial state
7. Test drag-and-drop with an image file
8. Resize browser to mobile width — verify responsive layout (upload panel hides after result, "Scan another" button appears)

- [ ] **Step 4: Verify no hardcoded worker URL in source**

```bash
cd /Users/first/Documents/Development/booklens
grep -r "REDACTED_WORKER_DOMAIN\|workers\.dev" frontend/src/
```

Expected: No matches. The worker URL should only come from `$env/static/public`.

- [ ] **Step 5: Final commit if any fixes were needed**

If any fixes were made during testing:

```bash
cd /Users/first/Documents/Development/booklens
git add -A frontend/
git commit -m "fix(frontend): address issues found during smoke test"
```

---

## Summary

| Task | What it does |
|------|-------------|
| 1 | Branch + scaffold SvelteKit |
| 2 | Environment variables |
| 3 | Types + API module |
| 4 | Global styles + app shell |
| 5 | Header component |
| 6 | DropZone component |
| 7 | ButtonRow component |
| 8 | LoadingSteps component |
| 9 | ResultCard component |
| 10 | ErrorBanner component |
| 11 | Layout + page orchestrator |
| 12 | Build verification + cleanup |
| 13 | CI/CD workflow update |
| 14 | Update CLAUDE.md |
| 15 | End-to-end smoke test |
