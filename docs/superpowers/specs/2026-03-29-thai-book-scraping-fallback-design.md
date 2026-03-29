# Thai Book Scraping Fallback — Design Spec

**Date:** 2026-03-29
**Status:** Implemented

## Problem

Most Thai-language books are not indexed by Google Books. When a user scans a Thai book cover, the AI correctly identifies the title and author, but Google Books returns no match — resulting in a degraded "AI ONLY" experience with no metadata.

## Solution

Use Cloudflare's Browser Rendering `/scrape` endpoint to search Thai book retailer websites as a fallback. When the AI detects a Thai-language cover, skip Google Books entirely and scrape Thai sources for full metadata.

## Architecture

### Enrichment Flow

```
User uploads cover
  → AI identifies title, author, AND language
  → if language === "th":
      → Try Kinokuniya Thailand search
        → match? → scrape detail page → return (source: "kinokuniya")
      → Try Naiin search
        → match? → scrape detail page → return (source: "naiin")
      → Try SE-ED search
        → match? → scrape detail page → return (source: "se_ed")
      → No match from any source
        → return AI-only result (source: "ai_vision")
  → else:
      → Google Books enrichment (existing flow)
```

First match wins — stop searching after the first source returns a result. Each source involves two scrape calls: one for the search results page, one for the detail page.

### AI Prompt Change

Update the AI vision prompt to also return a `language` field:

```
Reply ONLY with JSON: {"title":"...","author":"...","language":"..."}
```

Where `language` is an ISO 639-1 code (e.g. `"th"`, `"en"`, `"ja"`). This determines which enrichment path to use.

Update `BookIdentification` type:

```typescript
export interface BookIdentification {
  title: string;
  author: string;
  language: string;
}
```

### Worker Routing (index.ts)

```typescript
const identification = await identifyBook(env.AI, body.imageBase64);

const metadata = identification.language === 'th'
  ? await enrichFromThaiSources(identification, env)
  : await enrichBookMetadata(identification, env.GOOGLE_BOOKS_API_KEY);
```

### New Service: `thai-books.ts`

Responsible for scraping Thai book retailers. Exports a single function:

```typescript
export async function enrichFromThaiSources(
  identification: BookIdentification,
  env: Env
): Promise<BookMetadata>
```

Internally tries each source in priority order (Kinokuniya → Naiin → SE-ED). For each source:

1. **Search scrape** — construct a search URL with the AI-extracted title, scrape the results page using CSS selectors to find the first result's detail link
2. **Detail scrape** — follow that link, extract full metadata (title, author, publisher, description, page count, cover image, categories)

Returns `BookMetadata` with the appropriate `source` value, or falls back to AI-only if all sources fail.

### Scrape Endpoint

```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/scrape
Authorization: Bearer {api_token}
Content-Type: application/json

{
  "url": "...",
  "elements": [{"selector": "..."}],
  "gotoOptions": { "waitUntil": "networkidle0" }
}
```

`waitUntil: "networkidle0"` is needed for SPA sites (SE-ED) and JS-heavy pages (Naiin).

### Thai Book Sources

#### 1. Kinokuniya Thailand (priority: highest)

- **Search URL:** `https://thailand.kinokuniya.com/products?utf8=%E2%9C%93&is_searching=true&restrictBy[available_facet]=true&keywords={query}`
- **Detail URL:** `https://thailand.kinokuniya.com/bw/{isbn}` (ISBN in URL)
- **Strengths:** Author + ISBN in search results, broadest catalog (EN/TH/JP/CN), server-side rendered
- **Search result data:** title, author, price
- **Detail page data:** title, author, publisher, description, page count, ISBN, cover image, categories

#### 2. Naiin (priority: medium)

- **Search URL:** `https://www.naiin.com/search-result?title={query}`
- **Detail URL:** `https://www.naiin.com/product/detail/{product_id}`
- **Strengths:** Good Thai book coverage, author in search results, cover images
- **Caveats:** Cloudflare bot protection — may require `waitUntil: "networkidle0"` or specific headers
- **Search result data:** title, author, rating, price, cover image
- **Detail page data:** title, author, publisher, description, page count, categories

#### 3. SE-ED (priority: lowest)

- **Search URL:** `https://www.se-ed.com/search?filter.keyword={query}`
- **Detail URL:** `https://www.se-ed.com/physical/{slug}`
- **Strengths:** Major Thai retailer
- **Caveats:** SPA (requires JS rendering), no author in search results (only on detail page)
- **Search result data:** title, price
- **Detail page data:** title, author, publisher, description, page count, categories

CSS selectors for each source will be determined during implementation by inspecting the actual page DOM.

### Source Configuration Pattern

Each source is defined as a configuration object:

```typescript
interface ThaiBookSource {
  name: BookSource;
  buildSearchUrl: (query: string) => string;
  searchSelectors: Record<string, string>;    // CSS selectors for search results
  extractDetailUrl: (searchResult: ScrapeResult) => string | null;
  detailSelectors: Record<string, string>;    // CSS selectors for detail page
  mapToMetadata: (detailResult: ScrapeResult, detailUrl: string) => BookMetadata;
}
```

This keeps source-specific logic isolated and makes adding new sources straightforward.

### Response Shape

Extended `BookSource` type:

```typescript
export type BookSource = 'google_books' | 'ai_vision' | 'kinokuniya' | 'naiin' | 'se_ed';
```

The `BookMetadata` interface remains unchanged — all fields are populated from the detail page scrape. The `source` field indicates which retailer provided the data. The `infoLink` field points to the retailer's detail page URL.

### Frontend Changes

#### `BookSource` type

Add new source values to the frontend `BookSource` type.

#### `ResultCard.svelte`

- New sources (`kinokuniya`, `naiin`, `se_ed`) are treated like `google_books` — show full metadata card
- Badge text changes based on source:
  - `google_books` → "HIGH MATCH"
  - `kinokuniya` → "KINOKUNIYA MATCH"
  - `naiin` → "NAIIN MATCH"
  - `se_ed` → "SE-ED MATCH"
- "View on Google Books" link changes to source-appropriate text:
  - `kinokuniya` → "View on Kinokuniya Thailand"
  - `naiin` → "View on Naiin"
  - `se_ed` → "View on SE-ED"
- `ai_vision` behavior unchanged (shows reduced UI with notice)

### Authentication & Secrets

Two new worker environment variables (added via `wrangler secret put`):

- `CF_BROWSER_API_TOKEN` — Cloudflare API token with "Browser Rendering - Edit" permission
- `CF_ACCOUNT_ID` — Cloudflare account ID

These are added to the `Env` type:

```typescript
export interface Env {
  AI: Ai;
  GOOGLE_BOOKS_API_KEY?: string | undefined;
  ALLOWED_ORIGIN: string;
  CF_BROWSER_API_TOKEN?: string | undefined;
  CF_ACCOUNT_ID?: string | undefined;
}
```

Both are optional — if not configured, the Thai scraping path returns AI-only results gracefully.

### Result Caching

Cache enrichment results to avoid repeated scrape calls for the same book. Uses Cloudflare Workers KV.

**Cache key:** normalized `{title}:{author}` lowercased and trimmed (e.g. `"เด็กหอ:ปราบดา หยุ่น"`). This catches repeat scans of the same cover and different photos of the same book.

**Cache value:** the full `BookMetadata` JSON response.

**TTL:** 7 days — book metadata doesn't change often, but retailers may update prices/availability.

**Flow with cache:**

```
AI identifies title + author + language
  → compute cache key from title + author
  → check KV cache
  → if hit: return cached BookMetadata immediately
  → if miss: proceed with enrichment (Google Books or Thai sources)
  → on successful enrichment: write result to KV cache
```

Caching applies to both Google Books and Thai source results. AI-only results (no enrichment match) are **not** cached — the sources may have the book indexed later.

**New env binding:**

```typescript
export interface Env {
  // ... existing fields
  BOOK_CACHE?: KVNamespace | undefined;  // optional — caching disabled if not bound
}
```

KV namespace created via `wrangler kv namespace create BOOK_CACHE` and bound in `wrangler.toml`.

### Error Handling

- If a scrape call fails (timeout, HTTP error, bot protection block), skip that source and try the next
- If all sources fail, return AI-only result (same as current Google Books miss behavior)
- Individual source failures are silent — no error returned to the user
- Scrape timeout: use `gotoOptions.timeout` to cap each scrape at ~10 seconds

### Cost & Performance

- Each `/scrape` call with JS rendering is billed under Browser Rendering pricing
- **Best case:** 2 scrape calls (Kinokuniya search hit + detail) — ~4-8s
- **Typical miss → hit:** 4 scrape calls (Kinokuniya search miss + Naiin search hit + detail) — ~8-14s
- **Full miss:** 3 search scrapes, all miss, no detail calls — ~6-15s before returning AI-only
- Non-Thai books are unaffected (no scraping, same Google Books flow)

### Testing

- Unit tests for each source's URL building and selector mapping
- Integration tests with mocked scrape responses
- Each source's search and detail parsing tested independently

## Implementation Notes

- **SE-ED uses JSON-LD** instead of DOM selectors for both search and detail pages. The `script[type="application/ld+json"]` approach is more stable than MUI class selectors for this SPA site.
- **Kinokuniya `table.bookData`** parsing uses heuristic matching (first non-ISBN, non-numeric text = publisher, standalone number = page count) since CSS `:contains()` is not available via the scrape API.
- **Naiin label/value pairs** are matched positionally (`.product-label` and `.product-label-detail` elements paired by index).
- **Cache key** uses `title:author` lowercased and trimmed. Thai text is preserved as-is (no transliteration).
- **Source field added to `BookMetadata`** — this was a gap in the original spec that was resolved during Task 4 implementation (the `source: BookSource` field was needed in the `BookMetadata` interface for the `ThaiBookSource` interface to work).
