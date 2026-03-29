import { describe, it, expect } from 'vitest';
import { seedSource } from '../../../src/services/sources/se-ed';
import type { ScrapeResponse } from '../../../src/types';

type ScrapeResult = ScrapeResponse['result'];

function element(text: string, attributes: { name: string; value: string }[] = []) {
	return { text, html: text, attributes, height: 0, width: 0, top: 0, left: 0 };
}

describe('seedSource', () => {
	it('builds correct search URL', () => {
		const url = seedSource.buildSearchUrl('เด็กหอ');
		expect(url).toContain('se-ed.com/search');
		expect(url).toContain('filter.keyword=');
		expect(url).toContain(encodeURIComponent('เด็กหอ'));
	});

	it('extracts detail URL from JSON-LD search result', () => {
		const jsonLd = JSON.stringify({
			'@type': 'ItemList',
			itemListElement: [
				{ position: 1, name: 'เด็กหอ', url: 'https://www.se-ed.com/physical/test-book--abc123' }
			]
		});

		const searchResult: ScrapeResult = [
			{
				selector: 'script[type="application/ld+json"]',
				results: [element(jsonLd)]
			}
		];

		const detailUrl = seedSource.extractDetailUrl(searchResult);
		expect(detailUrl).toBe('https://www.se-ed.com/physical/test-book--abc123');
	});

	it('returns null when JSON-LD has no items', () => {
		const jsonLd = JSON.stringify({ '@type': 'ItemList', itemListElement: [] });
		const searchResult: ScrapeResult = [
			{ selector: 'script[type="application/ld+json"]', results: [element(jsonLd)] }
		];

		expect(seedSource.extractDetailUrl(searchResult)).toBeNull();
	});

	it('returns null when no JSON-LD scripts found', () => {
		const searchResult: ScrapeResult = [
			{ selector: 'script[type="application/ld+json"]', results: [] }
		];

		expect(seedSource.extractDetailUrl(searchResult)).toBeNull();
	});

	it('maps detail page JSON-LD to BookMetadata', () => {
		const productLd = JSON.stringify({
			'@type': 'Product',
			name: 'Harry Potter and the Philosopher\'s Stone',
			description: 'A boy discovers he is a wizard.',
			image: 'https://mp-static.se-ed.com/cover.jpg',
			sku: '9780747532743'
		});
		const breadcrumbLd = JSON.stringify({
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ item: { name: 'หนังสือ' } },
				{ item: { name: 'วรรณกรรมเยาวชน' } }
			]
		});
		const richText = 'ผู้เขียน J.K. Rowling สำนักพิมพ์ Bloomsbury';

		const detailResult: ScrapeResult = [
			{
				selector: 'script[type="application/ld+json"]',
				results: [element(productLd), element(breadcrumbLd)]
			},
			{
				selector: 'p.mpe-theme-paragraph',
				results: [element(richText)]
			}
		];

		const metadata = seedSource.mapToMetadata(detailResult, 'https://www.se-ed.com/physical/test--abc');
		expect(metadata).not.toBeNull();
		expect(metadata!.title).toBe('Harry Potter and the Philosopher\'s Stone');
		expect(metadata!.description).toBe('A boy discovers he is a wizard.');
		expect(metadata!.thumbnail).toBe('https://mp-static.se-ed.com/cover.jpg');
		expect(metadata!.categories).toBe('วรรณกรรมเยาวชน');
		expect(metadata!.infoLink).toBe('https://www.se-ed.com/physical/test--abc');
		expect(metadata!.source).toBe('se_ed');
	});

	it('extracts author and publisher from rich text paragraphs', () => {
		const productLd = JSON.stringify({
			'@type': 'Product',
			name: 'Test Book',
			description: 'A test.',
			sku: '123'
		});

		const detailResult: ScrapeResult = [
			{ selector: 'script[type="application/ld+json"]', results: [element(productLd)] },
			{
				selector: 'p.mpe-theme-paragraph',
				results: [
					element('ผู้เขียน : ปราบดา หยุ่น'),
					element('สำนักพิมพ์ : Salmon Books'),
					element('ISBN : 9781234567890 (ปกอ่อน) 256 หน้า')
				]
			}
		];

		const metadata = seedSource.mapToMetadata(detailResult, 'https://www.se-ed.com/physical/x');
		expect(metadata!.author).toBe('ปราบดา หยุ่น');
		expect(metadata!.publisher).toBe('Salmon Books');
		expect(metadata!.pageCount).toBe(256);
	});

	it('returns null when detail page has no Product JSON-LD', () => {
		const detailResult: ScrapeResult = [
			{ selector: 'script[type="application/ld+json"]', results: [] },
			{ selector: 'p.mpe-theme-paragraph', results: [] }
		];

		expect(seedSource.mapToMetadata(detailResult, 'https://www.se-ed.com/physical/x')).toBeNull();
	});
});
