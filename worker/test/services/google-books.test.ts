import { describe, it, expect, vi, afterEach } from 'vitest';
import { enrichBookMetadata } from '../../src/services/google-books';
import type { BookIdentification, GoogleBooksResponse } from '../../src/types';

const mockIdentification: BookIdentification = { title: 'Dune', author: 'Frank Herbert' };

function mockFetchResponse(body: GoogleBooksResponse): void {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
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
		const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
		expect(calledUrl).toContain('key=my-key');
	});

	it('omits API key from query string when undefined', async () => {
		mockFetchResponse({});
		await enrichBookMetadata(mockIdentification, undefined);

		const fetchMock = vi.mocked(fetch);
		const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
		expect(calledUrl).not.toContain('key=');
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
