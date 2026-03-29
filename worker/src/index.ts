import type { Env, ScanRequestBody, RateLimitEntry } from './types';
import { identifyBook } from './services/ai';
import { enrichBookMetadata } from './services/google-books';

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

			const identification = await identifyBook(env.AI, body.imageBase64);
			const metadata = await enrichBookMetadata(identification, env.GOOGLE_BOOKS_API_KEY);

			return jsonResponse(metadata as unknown as Record<string, unknown>, 200, cors);
		} catch {
			return jsonResponse({ error: 'Internal server error' }, 500, cors);
		}
	}
} satisfies ExportedHandler<Env>;
