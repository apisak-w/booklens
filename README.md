# BookLens

BookLens identifies books from cover photos using AI vision. Upload or snap a photo of any book cover, and BookLens extracts the title, author, and metadata from Google Books.

## How it works

1. User uploads a book cover image on the frontend
2. The image is sent as base64 to a Cloudflare Worker
3. The Worker runs **Llama 3.2 Vision** (via Cloudflare Workers AI) to extract the title and author
4. Google Books API enriches the result with publisher, page count, category, description, and more
5. The frontend displays the compiled book information

## Project structure

```
frontend/         Static site (HTML/CSS/JS) → Cloudflare Pages
worker/           Cloudflare Worker backend  → Cloudflare Workers
.github/workflows CI/CD via GitHub Actions
```

## Getting started

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated
- A Cloudflare account with Workers AI enabled (free tier: 10,000 neurons/day)
- (Optional) A [Google Books API key](https://console.cloud.google.com/apis/library/books.googleapis.com) for higher rate limits

### Local development

```bash
# Run the worker locally
cd worker && wrangler dev
```

Update `WORKER_URL` in `frontend/index.html` to `http://localhost:8787/scan` for local testing.

### Deploy

Deployments are automated via GitHub Actions on push to `main`:

- Changes in `frontend/` trigger a Cloudflare Pages deploy
- Changes in `worker/` trigger a Cloudflare Workers deploy

#### Manual deploy

```bash
# Deploy worker
cd worker && wrangler deploy

# Deploy frontend
wrangler pages deploy frontend --project-name=booklens
```

### Secrets

```bash
# Google Books API key (optional, increases rate limits)
wrangler secret put GOOGLE_BOOKS_API_KEY --config worker/wrangler.toml
```

GitHub Actions requires two repo secrets:
- `CLOUDFLARE_API_TOKEN` — API token with Workers Scripts and Pages edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

## Live

- **Frontend:** [booklens-mom.pages.dev](https://booklens-mom.pages.dev)
- **Worker:** `https://booklens-worker.apisak-wongkhempetch.workers.dev/scan`
