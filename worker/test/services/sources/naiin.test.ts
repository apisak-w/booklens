import { describe, it, expect } from 'vitest';
import { naiinSource } from '../../../src/services/sources/naiin';
import type { ScrapeResponse } from '../../../src/types';

type ScrapeResult = ScrapeResponse['result'];

function element(text: string, attributes: { name: string; value: string }[] = []) {
	return { text, html: text, attributes, height: 0, width: 0, top: 0, left: 0 };
}

describe('naiinSource', () => {
	it('builds correct search URL', () => {
		const url = naiinSource.buildSearchUrl('เด็กหอ');
		expect(url).toContain('naiin.com/search-result');
		expect(url).toContain('title=');
		expect(url).toContain(encodeURIComponent('เด็กหอ'));
	});

	it('extracts detail URL from search result', () => {
		const searchResult: ScrapeResult = [
			{
				selector: '.product-list .productitem a.item-img-block',
				results: [element('', [{ name: 'href', value: '/product/detail/697469' }])]
			},
			{
				selector: '.product-list .productitem a.itemname',
				results: [element('Harry Potter')]
			}
		];

		const detailUrl = naiinSource.extractDetailUrl(searchResult);
		expect(detailUrl).toBe('https://www.naiin.com/product/detail/697469');
	});

	it('returns null when no search results', () => {
		const searchResult: ScrapeResult = [
			{ selector: '.product-list .productitem a.item-img-block', results: [] },
			{ selector: '.product-list .productitem a.itemname', results: [] }
		];

		expect(naiinSource.extractDetailUrl(searchResult)).toBeNull();
	});

	it('maps detail page to BookMetadata', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'h1.product-name', results: [element('แฮร์รี่ พอตเตอร์ กับศิลาอาถรรพ์')] },
			{ selector: 'a.link-book-detail[href*="/writer/"]', results: [element('J.K. Rowling (เจ. เค. โรว์ลิง)')] },
			{ selector: 'a.link-book-detail[href*="/publisher/"]', results: [element('นานมีบุ๊คส์')] },
			{ selector: 'div[data-tab-content="1"] p', results: [element('เรื่องราวของเด็กชายแฮร์รี่')] },
			{ selector: '.product-label', results: [element('จำนวนหน้า'), element('บาร์โค้ด'), element('หมวดหมู่')] },
			{ selector: '.product-label-detail', results: [element('332 หน้า'), element('9786160472680'), element('วรรณกรรมเยาวชน')] },
			{ selector: 'img.img-gallery', results: [element('', [{ name: 'src', value: 'https://storage.naiin.com/cover.jpg' }])] }
		];

		const metadata = naiinSource.mapToMetadata(detailResult, 'https://www.naiin.com/product/detail/697469');
		expect(metadata).not.toBeNull();
		expect(metadata!.title).toBe('แฮร์รี่ พอตเตอร์ กับศิลาอาถรรพ์');
		expect(metadata!.author).toBe('J.K. Rowling (เจ. เค. โรว์ลิง)');
		expect(metadata!.publisher).toBe('นานมีบุ๊คส์');
		expect(metadata!.description).toContain('แฮร์รี่');
		expect(metadata!.pageCount).toBe(332);
		expect(metadata!.categories).toBe('วรรณกรรมเยาวชน');
		expect(metadata!.thumbnail).toBe('https://storage.naiin.com/cover.jpg');
		expect(metadata!.infoLink).toBe('https://www.naiin.com/product/detail/697469');
		expect(metadata!.source).toBe('naiin');
	});

	it('returns null when detail page has no title', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'h1.product-name', results: [] },
			{ selector: 'a.link-book-detail[href*="/writer/"]', results: [] },
			{ selector: 'a.link-book-detail[href*="/publisher/"]', results: [] },
			{ selector: 'div[data-tab-content="1"] p', results: [] },
			{ selector: '.product-label', results: [] },
			{ selector: '.product-label-detail', results: [] },
			{ selector: 'img.img-gallery', results: [] }
		];

		expect(naiinSource.mapToMetadata(detailResult, 'https://www.naiin.com/product/detail/123')).toBeNull();
	});
});
