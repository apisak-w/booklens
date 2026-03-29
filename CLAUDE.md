# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookLens is a web app that identifies books from cover photos using AI vision. Users upload a book cover image, AI extracts the title/author, then Google Books API enriches the result with full metadata.

## Architecture

Two independently deployed components in a single repo:

- **`frontend/`** — SvelteKit (Svelte 5) app deployed to **Cloudflare Pages**. Built with TypeScript, pnpm, and `@sveltejs/adapter-static` for SSG output. Calls the Cloudflare Worker to scan book covers.
- **`worker/`** — Cloudflare Worker (`worker.js`) deployed to **Cloudflare Workers**. Receives a base64 image via `POST /scan`, runs Llama 3.2 Vision via Workers AI binding, then fetches metadata from Google Books API.

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

## Deployment

GitHub Actions handles CI/CD (`.github/workflows/`):
- `deploy-pages.yml` — triggers on `frontend/**` changes on main
- `deploy-worker.yml` — triggers on `worker/**` changes on main

Both use `cloudflare/wrangler-action@v3` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `ci`, `perf`

Scopes: `worker`, `frontend`, `ci` (optional, use when the change is limited to one component)

Examples:
- `feat(worker): add ISBN lookup fallback`
- `fix(frontend): correct drag-drop on mobile Safari`
- `ci: add Cloudflare API token rotation reminder`
- `chore: restructure repo into frontend and worker directories`

## Key Details

- Worker AI model: `@cf/meta/llama-3.2-11b-vision-instruct` (free tier, 10k neurons/day)
- Worker is currently in **debug mode** — responses include a `debug` object. Remove before production.
- Frontend uses SvelteKit (Svelte 5) with pnpm, built via Vite, output to `frontend/build/`.
- Worker has no build step — single file (`worker.js`).
- CORS is fully open (`*`) on the worker.

## Sensitive Data Policy

**This is a public repo.** Never hardcode personal identifiers, domains, emails, or URLs into tracked files. Use Terraform variables (with `sensitive = true`) or environment variables instead. This includes:
- Worker/Pages domains (e.g. `*.workers.dev`, `*.pages.dev`)
- Email addresses
- Cloudflare account/zone IDs
- Any value that could identify the owner

History was rewritten once to scrub leaked identifiers — avoid repeating this.

## Decision Records

Architecture and design decision documents are stored in `docs/superpowers/specs/`. Implementation plans are stored in `docs/superpowers/plans/`.

- **Update documentation after each task is finished.** When a task completes, update the relevant spec or plan (mark steps done, note deviations, record decisions made during implementation). Documentation must reflect the current state of the project at all times.

## Git Workflow Rules

- **Always `git pull` before starting work.** After force pushes, PR merges, or any remote changes, sync local main before creating branches or making changes. Skipping this leads to stale state, lost work, and unnecessary file recreation.
- **Every change request must use a separate worktree.** Create a new git worktree (in `.worktrees/`) for each change request to prevent conflicts between concurrent agent sessions. Never work directly on `main` — always branch via `git worktree add .worktrees/<branch-name> -b <branch-name>`. Clean up worktrees after merging.
- **Never commit sensitive data "to fix later."** Get it right in the first commit. If a value might be sensitive, use a variable from the start. Cleaning up history after the fact (force push, filter-repo) is costly and error-prone.
- **Verify file/directory paths before writing.** Run `ls` or `file` to confirm a path is what you expect (e.g. not a binary) before creating files there.

## Error Self-Investigation Policy

When a mistake is made during development (build failure, wrong file edited, merge conflict, test regression, etc.):

1. **Stop and investigate.** Do not retry blindly. Identify the root cause of the error.
2. **Document the incident.** Write a short post-mortem in `docs/incidents/` with: what happened, why it happened, and what prevented it from being caught earlier.
3. **Add a preventive rule.** If the mistake reveals a gap in this file or project tooling, update CLAUDE.md or relevant configuration to prevent recurrence.
4. **Never silently fix and move on.** The goal is to build institutional memory so the same class of mistake does not happen twice.
