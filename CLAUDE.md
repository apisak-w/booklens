# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookLens is a web app that identifies books from cover photos using AI vision. Users upload a book cover image, AI extracts the title/author, then Google Books API enriches the result with full metadata.

## Architecture

Two independently deployed components in a single repo:

- **`frontend/`** — Single-page static site (`index.html`) deployed to **Cloudflare Pages** (`booklens-mom.pages.dev`). Contains all HTML/CSS/JS inline. Calls the Cloudflare Worker to scan book covers.
- **`worker/`** — Cloudflare Worker (`worker.js`) deployed to **Cloudflare Workers**. Receives a base64 image via `POST /scan`, runs Llama 3.2 Vision via Workers AI binding, then fetches metadata from Google Books API.

The frontend talks to the worker at `https://booklens-worker.apisak-wongkhempetch.workers.dev/scan`.

## Development Commands

```bash
# Worker local dev
cd worker && wrangler dev

# Deploy worker
cd worker && wrangler deploy

# Deploy frontend to Pages
wrangler pages deploy frontend --project-name=booklens

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
- No build step, bundler, or package manager — both components are single files.
- CORS is fully open (`*`) on the worker.
