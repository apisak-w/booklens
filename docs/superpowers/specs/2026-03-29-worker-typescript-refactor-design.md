# Worker TypeScript Refactor — Design Spec

**Date:** 2026-03-29
**Status:** Implemented
**Scope:** Refactor `worker/worker.js` to TypeScript with strict typing, clean code, linting, and unit tests.

## Goals

- Convert the worker from plain JavaScript to strict TypeScript
- Apply clean code principles with meaningful separation of concerns
- Add Vitest unit tests with `@cloudflare/vitest-pool-workers`
- Add ESLint (strict type-checked) + Prettier
- Add CI validation workflow for PRs

## Project Structure

```
worker/
├── src/
│   ├── index.ts              # Fetch handler, CORS, rate limiting, request validation
│   ├── services/
│   │   ├── ai.ts             # Workers AI vision call + response parsing
│   │   └── google-books.ts   # Google Books API enrichment
│   └── types.ts              # All type definitions
├── test/
│   ├── index.test.ts         # Handler integration tests
│   ├── services/
│   │   ├── ai.test.ts        # AI service unit tests
│   │   └── google-books.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
└── wrangler.toml
```

## TypeScript Configuration

Strict ruleset:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `exactOptionalPropertyTypes: true`
- `noFallthroughCasesInSwitch: true`
- Target: ES2022, Module: ESNext, Resolution: Bundler

Wrangler handles compilation natively — no extra build step. `main` in `wrangler.toml` points to `src/index.ts`.

## ESLint Configuration

Flat config (`eslint.config.js`) with:
- `@typescript-eslint/strict-type-checked` preset
- `@typescript-eslint/stylistic-type-checked` preset
- Type-aware linting via `parserOptions.project`
- Key rules:
  - `@typescript-eslint/no-explicit-any: error`
  - `@typescript-eslint/explicit-function-return-types: error`
  - `@typescript-eslint/explicit-module-boundary-types: error`
  - `@typescript-eslint/no-non-null-assertion: error`
  - `@typescript-eslint/strict-boolean-expressions: error`
  - `@typescript-eslint/switch-exhaustiveness-check: error`

## Prettier Configuration

Matches frontend conventions:
```json
{
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100
}
```

## Types

```typescript
interface Env {
  AI: Ai;
  GOOGLE_BOOKS_API_KEY?: string;
  ALLOWED_ORIGIN: string;
}

interface ScanRequestBody {
  imageBase64: string;
}

interface BookIdentification {
  title: string;
  author: string;
}

interface BookMetadata {
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

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  description?: string;
  infoLink?: string;
  imageLinks?: { thumbnail?: string };
}

interface GoogleBooksResponse {
  items?: Array<{ volumeInfo: GoogleBooksVolumeInfo }>;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
```

## Service Interfaces

```typescript
// services/ai.ts
function identifyBook(ai: Ai, imageBase64: string): Promise<BookIdentification>

// services/google-books.ts
function enrichBookMetadata(
  identification: BookIdentification,
  apiKey: string | undefined
): Promise<BookMetadata>
```

Each service receives only the dependencies it needs — no passing the full `Env`.

## Handler Flow

```
Request → CORS preflight check (OPTIONS → 200)
        → Origin validation (mismatch → 403)
        → Method validation (non-POST → 405)
        → Rate limit check (exceeded → 429)
        → Parse & validate body (missing imageBase64 → 400)
        → identifyBook(env.AI, body.imageBase64)
        → enrichBookMetadata(identification, env.GOOGLE_BOOKS_API_KEY)
        → Return BookMetadata as JSON (200)
```

## Error Handling

- Missing `ALLOWED_ORIGIN` → 500 (server misconfiguration)
- Bad origin → 403
- Wrong method → 405
- Rate limited → 429
- Missing `imageBase64` → 400
- AI failure → 502 (upstream dependency)
- Google Books failure → graceful fallback to AI-only result (behavior change from current crash)
- Unknown error → 500

## Testing Strategy

**Framework:** Vitest with `@cloudflare/vitest-pool-workers`

**Mocking:** Vitest mocks for `env.AI.run` and `global.fetch` (Google Books). No real external calls.

### AI Service Tests (`test/services/ai.test.ts`)
- Parses clean JSON from AI correctly
- Parses JSON wrapped in markdown code fences
- Falls back to regex extraction when JSON parse fails
- Returns Unknown/Unknown when AI response is garbage
- Throws on AI binding failure

### Google Books Service Tests (`test/services/google-books.test.ts`)
- Maps full response to BookMetadata
- Handles missing optional fields (null fallbacks)
- Returns AI-only fallback when no items returned
- Handles API key presence/absence in query string
- Upgrades http:// thumbnails to https://

### Handler Tests (`test/index.test.ts`)
- CORS preflight returns correct headers
- Rejects wrong origin with 403
- Rejects non-POST with 405
- Returns 429 after rate limit exceeded
- Returns 400 for missing imageBase64
- Returns 500 when ALLOWED_ORIGIN not set
- Happy path returns full BookMetadata

## CI Workflow

**`.github/workflows/validate-worker.yml`** — triggers on PRs touching `worker/**`:
1. `pnpm check` — TypeScript type checking (`tsc --noEmit`)
2. `pnpm lint` — ESLint + Prettier
3. `pnpm test` — Vitest

All three must pass before merge.

## Package Dependencies

**devDependencies:**
- `typescript`
- `@cloudflare/workers-types`
- `@cloudflare/vitest-pool-workers`
- `vitest`
- `eslint`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `typescript-eslint`
- `prettier`
- `wrangler`
