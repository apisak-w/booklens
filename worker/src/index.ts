import type { Env, ScanRequestBody, RateLimitEntry, BookMetadata } from './types';
import { identifyBook } from './services/ai';
import { enrichBookMetadata } from './services/google-books';
import { enrichWithAi } from './services/ai-enrich';
import { getCachedMetadata, setCachedMetadata } from './services/cache';

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

function jsonResponse(
	body: Record<string, unknown>,
	status: number,
	headers: Record<string, string>
): Response {
	return new Response(JSON.stringify(body), { status, headers });
}

function isScanRequestBody(value: unknown): value is ScanRequestBody {
	return (
		typeof value === 'object' &&
		value !== null &&
		'imageBase64' in value &&
		typeof (value as ScanRequestBody).imageBase64 === 'string'
	);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (!('ALLOWED_ORIGIN' in env) || env.ALLOWED_ORIGIN === '') {
			return jsonResponse({ error: 'Server misconfiguration: ALLOWED_ORIGIN not set' }, 500, {
				'Content-Type': 'application/json'
			});
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

			const identification = await identifyBook(env.GEMINI_API_KEY, body.imageBase64);
			console.log(
				`[scan] identified: "${identification.title}" (${String(identification.title_confidence)}) by "${identification.author}" (${String(identification.author_confidence)}) lang=${identification.language} (${String(identification.language_confidence)})`
			);

			// Check cache first
			const cached = await getCachedMetadata(
				env.BOOK_CACHE,
				identification.title,
				identification.author
			);
			if (cached) {
				console.log(`[scan] cache hit: source=${cached.source}`);
				return jsonResponse(cached as unknown as Record<string, unknown>, 200, cors);
			}
			console.log('[scan] cache miss');

			// Skip enrichment entirely if AI couldn't identify the book
			const isUnidentified =
				identification.title === 'Unknown' && identification.author === 'Unknown';
			let metadata: BookMetadata;

			if (isUnidentified) {
				console.log('[scan] skipping enrichment: unidentified book');
				metadata = {
					title: 'Unknown',
					author: 'Unknown',
					publisher: null,
					publishedDate: null,
					pageCount: null,
					categories: null,
					description: null,
					infoLink: null,
					thumbnail: null,
					source: 'ai_vision'
				};
			} else {
				// Try Google Books first, fall back to AI enrichment if no match
				metadata = await enrichBookMetadata(identification, env.GOOGLE_BOOKS_API_KEY);
				console.log(`[scan] google books: source=${metadata.source}`);

				if (metadata.source === 'ai_vision') {
					metadata = await enrichWithAi(env.GEMINI_API_KEY, identification);
					console.log(`[scan] ai enrichment: source=${metadata.source}`);
				}
			}

			// Cache successful enrichment (skip ai_vision fallbacks and unknown identifications)
			const isUnknown = metadata.title === 'Unknown' || metadata.author === 'Unknown';
			if (metadata.source !== 'ai_vision' && !isUnknown) {
				await setCachedMetadata(
					env.BOOK_CACHE,
					identification.title,
					identification.author,
					metadata
				);
				console.log('[scan] cached result');
			}

			return jsonResponse(metadata as unknown as Record<string, unknown>, 200, cors);
		} catch {
			return jsonResponse({ error: 'Internal server error' }, 500, cors);
		}
	}
} satisfies ExportedHandler<Env>;
