# Worker TypeScript Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the single-file `worker/worker.js` into a strict TypeScript codebase with clean code separation, ESLint, Prettier, Vitest unit tests, and CI validation.

**Architecture:** Hybrid split — `src/index.ts` (handler + CORS + rate limiting), `src/services/ai.ts` (Workers AI vision), `src/services/google-books.ts` (metadata enrichment), `src/types.ts` (all type definitions). Tests mirror source structure under `test/`.

**Tech Stack:** TypeScript (strict), Wrangler (native TS compilation), Vitest + @cloudflare/vitest-pool-workers, ESLint (strict-type-checked), Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-03-29-worker-typescript-refactor-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `worker/src/types.ts` | All type definitions (Env, request/response shapes, API types) |
| Create | `worker/src/services/ai.ts` | Workers AI vision call + response parsing |
| Create | `worker/src/services/google-books.ts` | Google Books API enrichment |
| Create | `worker/src/index.ts` | Fetch handler, CORS, rate limiting, request validation |
| Create | `worker/test/services/ai.test.ts` | AI service unit tests |
| Create | `worker/test/services/google-books.test.ts` | Google Books service unit tests |
| Create | `worker/test/index.test.ts` | Handler integration tests |
| Create | `worker/tsconfig.json` | Strict TypeScript config |
| Create | `worker/package.json` | Dependencies and scripts |
| Create | `worker/vitest.config.ts` | Vitest with Workers pool |
| Create | `worker/eslint.config.js` | Strict type-checked ESLint |
| Create | `worker/.prettierrc` | Prettier config matching frontend |
| Modify | `worker/wrangler.toml` | Update `main` to `src/index.ts` |
| Delete | `worker/worker.js` | Replaced by TypeScript source |
| Create | `.github/workflows/validate-worker.yml` | CI: type check + lint + test on PRs |

---

### Task 1: Scaffold worker package and tooling configs

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/vitest.config.ts`
- Create: `worker/eslint.config.js`
- Create: `worker/.prettierrc`
- Modify: `worker/wrangler.toml`

- [ ] **Step 1: Create `worker/package.json`**

```json
{
  "name": "booklens-worker",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "check": "tsc --noEmit",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "@cloudflare/workers-types": "^4.20250321.0",
    "eslint": "^10.0.3",
    "eslint-config-prettier": "^10.1.8",
    "prettier": "^3.8.1",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.57.0",
    "vitest": "^3.1.1",
    "wrangler": "^4.14.1"
  }
}
```

- [ ] **Step 2: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types/2023-07-01", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": ".",
    "include": ["src/**/*.ts", "test/**/*.ts"]
  }
}
```

- [ ] **Step 3: Create `worker/vitest.config.ts`**

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.toml' }
			}
		}
	}
});
```

- [ ] **Step 4: Create `worker/eslint.config.js`**

```javascript
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist/', '.wrangler/', 'node_modules/']
	},
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/explicit-function-return-types': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'no-undef': 'off'
		}
	},
	eslintConfigPrettier
);
```

- [ ] **Step 5: Create `worker/.prettierrc`**

```json
{
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100
}
```

- [ ] **Step 6: Update `worker/wrangler.toml` — change `main` to `src/index.ts`**

Change line 2 from:
```toml
main = "worker.js"
```
to:
```toml
main = "src/index.ts"
```

- [ ] **Step 7: Install dependencies**

Run: `cd worker && pnpm install`

- [ ] **Step 8: Commit**

```bash
git add worker/package.json worker/pnpm-lock.yaml worker/tsconfig.json worker/vitest.config.ts worker/eslint.config.js worker/.prettierrc worker/wrangler.toml
git commit -m "chore(worker): scaffold TypeScript tooling and configs"
```

---

### Task 2: Create type definitions

**Files:**
- Create: `worker/src/types.ts`

- [ ] **Step 1: Create `worker/src/types.ts`**

```typescript
export interface Env {
	AI: Ai;
	GOOGLE_BOOKS_API_KEY?: string | undefined;
	ALLOWED_ORIGIN: string;
}

export interface ScanRequestBody {
	imageBase64: string;
}

export interface BookIdentification {
	title: string;
	author: string;
}

export interface BookMetadata {
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

export interface GoogleBooksVolumeInfo {
	title?: string | undefined;
	authors?: string[] | undefined;
	publisher?: string | undefined;
	publishedDate?: string | undefined;
	pageCount?: number | undefined;
	categories?: string[] | undefined;
	description?: string | undefined;
	infoLink?: string | undefined;
	imageLinks?: { thumbnail?: string | undefined } | undefined;
}

export interface GoogleBooksResponse {
	items?: Array<{ volumeInfo: GoogleBooksVolumeInfo }> | undefined;
}

export interface RateLimitEntry {
	count: number;
	resetAt: number;
}
```

Note: `exactOptionalPropertyTypes` requires optional properties to explicitly include `| undefined` in their type.

- [ ] **Step 2: Verify types compile**

Run: `cd worker && npx tsc --noEmit`
Expected: No errors (there will be no `src/index.ts` yet, but types.ts should compile alone if included)

- [ ] **Step 3: Commit**

```bash
git add worker/src/types.ts
git commit -m "feat(worker): add type definitions"
```

---

### Task 3: Implement AI service with tests (TDD)

**Files:**
- Create: `worker/src/services/ai.ts`
- Create: `worker/test/services/ai.test.ts`

- [ ] **Step 1: Write failing tests for `identifyBook`**

Create `worker/test/services/ai.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { identifyBook } from '../../src/services/ai.js';

function createMockAi(response: string): Ai {
	return {
		run: vi.fn().mockResolvedValue({ response })
	} as unknown as Ai;
}

function createFailingAi(error: Error): Ai {
	return {
		run: vi.fn().mockRejectedValue(error)
	} as unknown as Ai;
}

describe('identifyBook', () => {
	it('parses clean JSON from AI', async () => {
		const ai = createMockAi('{"title":"Dune","author":"Frank Herbert"}');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('parses JSON wrapped in markdown code fences', async () => {
		const ai = createMockAi('```json\n{"title":"Dune","author":"Frank Herbert"}\n```');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('falls back to regex extraction when JSON parse fails', async () => {
		const ai = createMockAi('The title is "Dune" and the author is "Frank Herbert"... {"title": "Dune", "author": "Frank Herbert"} extra junk');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('returns Unknown when AI response is garbage', async () => {
		const ai = createMockAi('I cannot identify this book');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Unknown', author: 'Unknown' });
	});

	it('throws on AI binding failure', async () => {
		const ai = createFailingAi(new Error('AI unavailable'));
		await expect(identifyBook(ai, 'base64data')).rejects.toThrow('AI unavailable');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run test/services/ai.test.ts`
Expected: FAIL — module `../../src/services/ai.js` not found

- [ ] **Step 3: Implement `identifyBook`**

Create `worker/src/services/ai.ts`:

```typescript
import type { BookIdentification } from '../types.js';

const AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_TOKENS = 150;

export async function identifyBook(ai: Ai, imageBase64: string): Promise<BookIdentification> {
	const aiResponse = (await ai.run(AI_MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'This is a book cover. Reply ONLY with JSON: {"title":"...","author":"..."}'
					},
					{
						type: 'image_url',
						image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
					}
				]
			}
		],
		max_tokens: MAX_TOKENS
	})) as { response: string };

	return parseAiResponse(aiResponse.response);
}

function parseAiResponse(raw: string): BookIdentification {
	try {
		const cleaned = raw.trim().replace(/```json\n?|```/g, '').trim();
		const parsed: unknown = JSON.parse(cleaned);

		if (isBookIdentification(parsed)) {
			return {
				title: parsed.title || 'Unknown',
				author: parsed.author || 'Unknown'
			};
		}
	} catch {
		// Fall through to regex extraction
	}

	return extractWithRegex(raw);
}

function isBookIdentification(value: unknown): value is { title?: string; author?: string } {
	return typeof value === 'object' && value !== null;
}

function extractWithRegex(raw: string): BookIdentification {
	const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
	const authorMatch = raw.match(/"author"\s*:\s*"([^"]+)"/);

	return {
		title: titleMatch?.[1] ?? 'Unknown',
		author: authorMatch?.[1] ?? 'Unknown'
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run test/services/ai.test.ts`
Expected: 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add worker/src/services/ai.ts worker/test/services/ai.test.ts
git commit -m "feat(worker): add AI service with TDD tests"
```

---

### Task 4: Implement Google Books service with tests (TDD)

**Files:**
- Create: `worker/src/services/google-books.ts`
- Create: `worker/test/services/google-books.test.ts`

- [ ] **Step 1: Write failing tests for `enrichBookMetadata`**

Create `worker/test/services/google-books.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichBookMetadata } from '../../src/services/google-books.js';
import type { BookIdentification, GoogleBooksResponse } from '../../src/types.js';

const mockIdentification: BookIdentification = { title: 'Dune', author: 'Frank Herbert' };

function mockFetchResponse(body: GoogleBooksResponse): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(new Response(JSON.stringify(body)))
	);
}

describe('enrichBookMetadata', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('maps full Google Books response to BookMetadata', async () => {
		mockFetchResponse({
			items: [
				{
					volumeInfo: {
						title: 'Dune',
						authors: ['Frank Herbert'],
						publisher: 'Chilton Books',
						publishedDate: '1965',
						pageCount: 412,
						categories: ['Fiction'],
						description: 'A science fiction novel.',
						infoLink: 'https://books.google.com/dune',
						imageLinks: { thumbnail: 'https://covers.google.com/dune.jpg' }
					}
				}
			]
		});

		const result = await enrichBookMetadata(mockIdentification, 'test-api-key');

		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			publisher: 'Chilton Books',
			publishedDate: '1965',
			pageCount: 412,
			categories: 'Fiction',
			description: 'A science fiction novel.',
			infoLink: 'https://books.google.com/dune',
			thumbnail: 'https://covers.google.com/dune.jpg'
		});
	});

	it('handles missing optional fields with null fallbacks', async () => {
		mockFetchResponse({
			items: [{ volumeInfo: { title: 'Dune' } }]
		});

		const result = await enrichBookMetadata(mockIdentification, undefined);

		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			publisher: null,
			publishedDate: null,
			pageCount: null,
			categories: null,
			description: null,
			infoLink: null,
			thumbnail: null
		});
	});

	it('returns AI-only fallback when no items returned', async () => {
		mockFetchResponse({});

		const result = await enrichBookMetadata(mockIdentification, undefined);

		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			publisher: null,
			publishedDate: null,
			pageCount: null,
			categories: null,
			description: null,
			infoLink: null,
			thumbnail: null
		});
	});

	it('includes API key in query string when provided', async () => {
		mockFetchResponse({});
		await enrichBookMetadata(mockIdentification, 'my-key');

		const fetchMock = vi.mocked(fetch);
		const calledUrl = fetchMock.mock.calls[0]?.[0];
		expect(String(calledUrl)).toContain('key=my-key');
	});

	it('omits API key from query string when undefined', async () => {
		mockFetchResponse({});
		await enrichBookMetadata(mockIdentification, undefined);

		const fetchMock = vi.mocked(fetch);
		const calledUrl = fetchMock.mock.calls[0]?.[0];
		expect(String(calledUrl)).not.toContain('key=');
	});

	it('upgrades http:// thumbnails to https://', async () => {
		mockFetchResponse({
			items: [
				{
					volumeInfo: {
						imageLinks: { thumbnail: 'http://covers.google.com/dune.jpg' }
					}
				}
			]
		});

		const result = await enrichBookMetadata(mockIdentification, undefined);
		expect(result.thumbnail).toBe('https://covers.google.com/dune.jpg');
	});

	it('returns AI fallback when fetch throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const result = await enrichBookMetadata(mockIdentification, undefined);

		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			publisher: null,
			publishedDate: null,
			pageCount: null,
			categories: null,
			description: null,
			infoLink: null,
			thumbnail: null
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run test/services/google-books.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `enrichBookMetadata`**

Create `worker/src/services/google-books.ts`:

```typescript
import type { BookIdentification, BookMetadata, GoogleBooksResponse } from '../types.js';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export async function enrichBookMetadata(
	identification: BookIdentification,
	apiKey: string | undefined
): Promise<BookMetadata> {
	const fallback = buildFallbackMetadata(identification);

	try {
		const url = buildSearchUrl(identification, apiKey);
		const response = await fetch(url);
		const data = (await response.json()) as GoogleBooksResponse;
		const firstItem = data.items?.[0];

		if (!firstItem) {
			return fallback;
		}

		const vol = firstItem.volumeInfo;
		return {
			title: vol.title ?? identification.title,
			author: vol.authors?.join(', ') ?? identification.author,
			publisher: vol.publisher ?? null,
			publishedDate: vol.publishedDate ?? null,
			pageCount: vol.pageCount ?? null,
			categories: vol.categories?.[0] ?? null,
			description: vol.description ?? null,
			infoLink: vol.infoLink ?? null,
			thumbnail: upgradeThumbnailUrl(vol.imageLinks?.thumbnail)
		};
	} catch {
		return fallback;
	}
}

function buildSearchUrl(identification: BookIdentification, apiKey: string | undefined): string {
	const query = encodeURIComponent(`${identification.title} ${identification.author}`);
	const keyParam = apiKey !== undefined ? `&key=${apiKey}` : '';
	return `${GOOGLE_BOOKS_API}?q=${query}&maxResults=1${keyParam}`;
}

function upgradeThumbnailUrl(url: string | undefined): string | null {
	if (url === undefined) {
		return null;
	}
	return url.replace('http://', 'https://');
}

function buildFallbackMetadata(identification: BookIdentification): BookMetadata {
	return {
		title: identification.title,
		author: identification.author,
		publisher: null,
		publishedDate: null,
		pageCount: null,
		categories: null,
		description: null,
		infoLink: null,
		thumbnail: null
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run test/services/google-books.test.ts`
Expected: 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add worker/src/services/google-books.ts worker/test/services/google-books.test.ts
git commit -m "feat(worker): add Google Books service with TDD tests"
```

---

### Task 5: Implement fetch handler with tests (TDD)

**Files:**
- Create: `worker/src/index.ts`
- Create: `worker/test/index.test.ts`

- [ ] **Step 1: Write failing tests for the fetch handler**

Create `worker/test/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index.js';
import type { Env } from '../src/types.js';

function createEnv(overrides: Partial<Env> = {}): Env {
	return {
		AI: {
			run: vi.fn().mockResolvedValue({
				response: '{"title":"Dune","author":"Frank Herbert"}'
			})
		} as unknown as Ai,
		ALLOWED_ORIGIN: 'https://example.com',
		GOOGLE_BOOKS_API_KEY: 'test-key',
		...overrides
	};
}

function createRequest(
	method: string,
	options: { origin?: string; body?: unknown; ip?: string } = {}
): Request {
	const { origin = 'https://example.com', body, ip = '1.2.3.4' } = options;
	const init: RequestInit = {
		method,
		headers: {
			Origin: origin,
			'Content-Type': 'application/json',
			'CF-Connecting-IP': ip
		}
	};
	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}
	return new Request('https://worker.example.com/scan', init);
}

describe('worker fetch handler', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						items: [
							{
								volumeInfo: {
									title: 'Dune',
									authors: ['Frank Herbert'],
									publisher: 'Chilton Books',
									publishedDate: '1965',
									pageCount: 412,
									categories: ['Fiction'],
									description: 'A novel.',
									infoLink: 'https://books.google.com/dune',
									imageLinks: { thumbnail: 'https://covers.google.com/dune.jpg' }
								}
							}
						]
					})
				)
			)
		);
	});

	it('returns CORS headers on OPTIONS preflight', async () => {
		const env = createEnv();
		const req = createRequest('OPTIONS');
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
		expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
	});

	it('rejects wrong origin with 403', async () => {
		const env = createEnv();
		const req = createRequest('POST', {
			origin: 'https://evil.com',
			body: { imageBase64: 'abc' }
		});
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(403);
	});

	it('rejects non-POST with 405', async () => {
		const env = createEnv();
		const req = createRequest('GET');
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(405);
	});

	it('returns 400 for missing imageBase64', async () => {
		const env = createEnv();
		const req = createRequest('POST', { body: {} });
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(400);
	});

	it('returns 500 when ALLOWED_ORIGIN not set', async () => {
		const env = createEnv({ ALLOWED_ORIGIN: '' as unknown as string });
		// Override with truly missing value
		delete (env as Record<string, unknown>)['ALLOWED_ORIGIN'];
		const envWithout = env as unknown as Env;
		const req = createRequest('POST', { body: { imageBase64: 'abc' } });
		const res = await worker.fetch(req, envWithout);
		expect(res.status).toBe(500);
		const json = (await res.json()) as { error: string };
		expect(json.error).toContain('ALLOWED_ORIGIN');
	});

	it('returns 429 after rate limit exceeded', async () => {
		const env = createEnv();
		const ip = '10.0.0.1';

		// Exhaust rate limit (10 requests)
		for (let i = 0; i < 10; i++) {
			const req = createRequest('POST', { ip, body: { imageBase64: 'abc' } });
			await worker.fetch(req, env);
		}

		// 11th request should be rate limited
		const req = createRequest('POST', { ip, body: { imageBase64: 'abc' } });
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(429);
	});

	it('returns BookMetadata on happy path', async () => {
		const env = createEnv();
		const req = createRequest('POST', { body: { imageBase64: 'abc' } });
		const res = await worker.fetch(req, env);
		expect(res.status).toBe(200);
		const json = (await res.json()) as Record<string, unknown>;
		expect(json).toHaveProperty('title');
		expect(json).toHaveProperty('author');
		expect(json).toHaveProperty('publisher');
		expect(json).toHaveProperty('thumbnail');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run test/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/index.ts`**

Create `worker/src/index.ts`:

```typescript
import type { Env, ScanRequestBody, RateLimitEntry } from './types.js';
import { identifyBook } from './services/ai.js';
import { enrichBookMetadata } from './services/google-books.js';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (entry === undefined || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return true;
	}

	entry.count++;
	return entry.count <= RATE_LIMIT;
}

function corsHeaders(allowedOrigin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Content-Type': 'application/json'
	};
}

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>): Response {
	return new Response(JSON.stringify(body), { status, headers });
}

function isScanRequestBody(value: unknown): value is ScanRequestBody {
	return typeof value === 'object' && value !== null && 'imageBase64' in value && typeof (value as ScanRequestBody).imageBase64 === 'string';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!('ALLOWED_ORIGIN' in env) || env.ALLOWED_ORIGIN === '') {
			return jsonResponse(
				{ error: 'Server misconfiguration: ALLOWED_ORIGIN not set' },
				500,
				{ 'Content-Type': 'application/json' }
			);
		}

		const cors = corsHeaders(env.ALLOWED_ORIGIN);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 200, headers: cors });
		}

		const origin = request.headers.get('Origin');
		if (origin !== env.ALLOWED_ORIGIN) {
			return jsonResponse({ error: 'Forbidden' }, 403, cors);
		}

		if (request.method !== 'POST') {
			return jsonResponse({ error: 'Method not allowed' }, 405, cors);
		}

		const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		if (!checkRateLimit(ip)) {
			return jsonResponse({ error: 'Too many requests' }, 429, cors);
		}

		try {
			const body: unknown = await request.json();

			if (!isScanRequestBody(body)) {
				return jsonResponse({ error: 'Missing imageBase64' }, 400, cors);
			}

			const identification = await identifyBook(env.AI, body.imageBase64);
			const metadata = await enrichBookMetadata(identification, env.GOOGLE_BOOKS_API_KEY);

			return jsonResponse(metadata as unknown as Record<string, unknown>, 200, cors);
		} catch {
			return jsonResponse({ error: 'Internal server error' }, 500, cors);
		}
	}
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `cd worker && npx vitest run`
Expected: All tests passing (5 AI + 7 Google Books + 7 handler = 19 tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts worker/test/index.test.ts
git commit -m "feat(worker): add fetch handler with TDD tests"
```

---

### Task 6: Run type check, lint, format, and fix issues

**Files:**
- Possibly modify: all `worker/src/**/*.ts` and `worker/test/**/*.ts` files

- [ ] **Step 1: Run type check**

Run: `cd worker && pnpm check`
Expected: No errors. If there are errors, fix them in the relevant files.

- [ ] **Step 2: Run Prettier format**

Run: `cd worker && pnpm format`

- [ ] **Step 3: Run ESLint**

Run: `cd worker && pnpm lint`
Expected: No errors. If there are errors, fix them. Common issues may include:
- Test files needing type assertions adjusted for `strict-boolean-expressions`
- `@typescript-eslint/no-unsafe-*` rules flagging mock types

If test files need rule relaxation, add an override in `eslint.config.js` scoped to `test/**/*.ts` for rules that conflict with test mocking patterns (e.g., `@typescript-eslint/no-unsafe-assignment`).

- [ ] **Step 4: Run all tests one final time**

Run: `cd worker && pnpm test`
Expected: All 19 tests passing

- [ ] **Step 5: Commit any fixes**

```bash
git add -A worker/
git commit -m "style(worker): fix lint and formatting issues"
```

---

### Task 7: Delete old worker.js and verify

**Files:**
- Delete: `worker/worker.js`

- [ ] **Step 1: Delete the old JavaScript worker**

Run: `rm worker/worker.js`

- [ ] **Step 2: Verify Wrangler can still resolve the entry point**

Run: `cd worker && npx wrangler deploy --dry-run --outdir dist`
Expected: Successful dry-run build output in `dist/`. This confirms Wrangler finds `src/index.ts`.

- [ ] **Step 3: Run full test suite one last time**

Run: `cd worker && pnpm test`
Expected: All tests passing

- [ ] **Step 4: Commit**

```bash
git add worker/worker.js
git commit -m "refactor(worker): remove old worker.js in favor of TypeScript source"
```

---

### Task 8: Add CI validation workflow

**Files:**
- Create: `.github/workflows/validate-worker.yml`

- [ ] **Step 1: Create `.github/workflows/validate-worker.yml`**

```yaml
name: Validate Worker

on:
  pull_request:
    paths:
      - worker/**
      - .github/workflows/validate-worker.yml

jobs:
  validate:
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
          cache-dependency-path: worker/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: worker
        run: pnpm install --frozen-lockfile

      - name: Type check
        working-directory: worker
        run: pnpm check

      - name: Lint
        working-directory: worker
        run: pnpm lint

      - name: Test
        working-directory: worker
        run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/validate-worker.yml
git commit -m "ci(worker): add type check, lint, and test validation on PRs"
```

---

### Task 9: Update deploy workflow for TypeScript

**Files:**
- Modify: `.github/workflows/deploy-worker.yml`

- [ ] **Step 1: Update deploy workflow to install deps before deploying**

Since Wrangler now needs to compile TypeScript and resolve `node_modules` for type packages, update the deploy workflow:

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - worker/**
      - .github/workflows/deploy-worker.yml
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
          cache-dependency-path: worker/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: worker
        run: pnpm install --frozen-lockfile

      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: worker
          command: deploy
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-worker.yml
git commit -m "ci(worker): update deploy workflow for TypeScript build"
```

---

### Task 10: Final verification and cleanup

- [ ] **Step 1: Run full validation suite**

```bash
cd worker && pnpm check && pnpm lint && pnpm test
```

Expected: All green — type check passes, lint passes, all tests pass.

- [ ] **Step 2: Verify git status is clean**

Run: `git status`
Expected: Clean working tree on the feature branch.

- [ ] **Step 3: Update design spec status**

In `docs/superpowers/specs/2026-03-29-worker-typescript-refactor-design.md`, change:
```
**Status:** Approved
```
to:
```
**Status:** Implemented
```

- [ ] **Step 4: Commit doc update**

```bash
git add docs/superpowers/specs/2026-03-29-worker-typescript-refactor-design.md
git commit -m "docs(worker): mark TypeScript refactor spec as implemented"
```
