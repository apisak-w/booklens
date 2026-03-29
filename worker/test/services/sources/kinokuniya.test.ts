import { describe, it, expect } from 'vitest';
import { kinokuniyaSource } from '../../../src/services/sources/kinokuniya';
import type { ScrapeResponse } from '../../../src/types';

type ScrapeResult = ScrapeResponse['result'];

function element(text: string, attributes: { name: string; value: string }[] = []) {
	return { text, html: text, attributes, height: 0, width: 0, top: 0, left: 0 };
}

describe('kinokuniyaSource', () => {
	it('builds correct search URL', () => {
		const url = kinokuniyaSource.buildSearchUrl('เด็กหอ');
		expect(url).toContain('thailand.kinokuniya.com/products');
		expect(url).toContain('keywords=');
		expect(url).toContain(encodeURIComponent('เด็กหอ'));
	});

	it('extracts detail URL from search result', () => {
		const searchResult: ScrapeResult = [
			{
				selector: '#image_or_detail .box .inner_box > a',
				results: [element('', [{ name: 'href', value: '/bw/9781408855652' }])]
			},
			{
				selector: '#image_or_detail .box span.title',
				results: [element('Harry Potter')]
			}
		];

		const detailUrl = kinokuniyaSource.extractDetailUrl(searchResult);
		expect(detailUrl).toBe('https://thailand.kinokuniya.com/bw/9781408855652');
	});

	it('returns null when no search results', () => {
		const searchResult: ScrapeResult = [
			{ selector: '#image_or_detail .box .inner_box > a', results: [] },
			{ selector: '#image_or_detail .box span.title', results: [] }
		];

		expect(kinokuniyaSource.extractDetailUrl(searchResult)).toBeNull();
	});

	it('maps detail page to BookMetadata', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'h1#itemTitle', results: [element("Harry Potter and the Philosopher's Stone [Paperback]")] },
			{ selector: 'p.author.search_by_author a', results: [element('Rowling, J.K.')] },
			{ selector: 'p.long_description', results: [element('Harry Potter thinks he is an ordinary boy.')] },
			{ selector: 'table.bookData td', results: [element('Bloomsbury Publishing'), element('2014'), element('332'), element('9781408855652'), element('Fiction')] },
			{ selector: 'img[src*="bci.kinokuniya.com"]', results: [element('', [{ name: 'src', value: 'https://bci.kinokuniya.com/th/jsp/images/book-img/default/9781408855652.JPG' }])] }
		];

		const metadata = kinokuniyaSource.mapToMetadata(detailResult, 'https://thailand.kinokuniya.com/bw/9781408855652');
		expect(metadata).not.toBeNull();
		expect(metadata!.title).toContain('Harry Potter');
		expect(metadata!.author).toBe('Rowling, J.K.');
		expect(metadata!.description).toContain('ordinary boy');
		expect(metadata!.infoLink).toBe('https://thailand.kinokuniya.com/bw/9781408855652');
		expect(metadata!.source).toBe('kinokuniya');
	});

	it('strips format suffix from title', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'h1#itemTitle', results: [element('Dune [Paperback]')] },
			{ selector: 'p.author.search_by_author a', results: [element('Herbert, Frank')] },
			{ selector: 'p.long_description', results: [] },
			{ selector: 'table.bookData td', results: [] },
			{ selector: 'img[src*="bci.kinokuniya.com"]', results: [] }
		];

		const metadata = kinokuniyaSource.mapToMetadata(detailResult, 'https://thailand.kinokuniya.com/bw/123');
		expect(metadata!.title).toBe('Dune');
	});

	it('returns null when detail page has no title', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'h1#itemTitle', results: [] },
			{ selector: 'p.author.search_by_author a', results: [] },
			{ selector: 'p.long_description', results: [] },
			{ selector: 'table.bookData td', results: [] },
			{ selector: 'img[src*="bci.kinokuniya.com"]', results: [] }
		];

		expect(kinokuniyaSource.mapToMetadata(detailResult, 'https://thailand.kinokuniya.com/bw/123')).toBeNull();
	});
});
