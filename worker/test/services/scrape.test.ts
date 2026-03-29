import { describe, it, expect, vi, afterEach } from 'vitest';
import { scrapePage } from '../../src/services/scrape';
import type { ScrapeResponse } from '../../src/types';

function mockFetchResponse(body: ScrapeResponse, status = 200): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
	);
}

describe('scrapePage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends correct request to scrape API', async () => {
		mockFetchResponse({
			success: true,
			result: [{ selector: 'h1', results: [{ text: 'Test', html: 'Test', attributes: [], height: 0, width: 0, top: 0, left: 0 }] }]
		});

		await scrapePage('https://example.com', ['h1', 'p'], 'token-123', 'acct-456');

		const fetchMock = vi.mocked(fetch);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acct-456/browser-rendering/scrape');
		expect(init.method).toBe('POST');

		const headers = init.headers as Record<string, string>;
		expect(headers['Authorization']).toBe('Bearer token-123');
		expect(headers['Content-Type']).toBe('application/json');

		const body = JSON.parse(init.body as string);
		expect(body.url).toBe('https://example.com');
		expect(body.elements).toEqual([{ selector: 'h1' }, { selector: 'p' }]);
		expect(body.gotoOptions).toEqual({ waitUntil: 'networkidle0', timeout: 10000 });
	});

	it('returns parsed scrape results on success', async () => {
		const mockResult: ScrapeResponse = {
			success: true,
			result: [
				{
					selector: 'h1',
					results: [{
						text: 'Book Title',
						html: 'Book Title',
						attributes: [],
						height: 40, width: 600, top: 100, left: 0
					}]
				}
			]
		};
		mockFetchResponse(mockResult);

		const result = await scrapePage('https://example.com', ['h1'], 'tok', 'acct');
		expect(result).toEqual(mockResult.result);
	});

	it('returns null when API returns non-200', async () => {
		mockFetchResponse({ success: false, result: [] }, 500);

		const result = await scrapePage('https://example.com', ['h1'], 'tok', 'acct');
		expect(result).toBeNull();
	});

	it('returns null when success is false', async () => {
		mockFetchResponse({ success: false, result: [] });

		const result = await scrapePage('https://example.com', ['h1'], 'tok', 'acct');
		expect(result).toBeNull();
	});

	it('returns null when fetch throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const result = await scrapePage('https://example.com', ['h1'], 'tok', 'acct');
		expect(result).toBeNull();
	});
});
