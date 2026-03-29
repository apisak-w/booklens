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
