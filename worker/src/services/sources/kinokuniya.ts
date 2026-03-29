import type { ThaiBookSource, ScrapeResult } from './types';
import type { BookMetadata } from '../../types';

const BASE_URL = 'https://thailand.kinokuniya.com';

function findSelector(result: ScrapeResult, selector: string) {
	return result.find((r) => r.selector === selector);
}

function getAttribute(result: ScrapeResult, selector: string, attr: string): string | null {
	const el = findSelector(result, selector)?.results[0];
	if (!el) return null;
	return el.attributes.find((a) => a.name === attr)?.value ?? null;
}

function getText(result: ScrapeResult, selector: string): string | null {
	return findSelector(result, selector)?.results[0]?.text?.trim() || null;
}

function stripFormatSuffix(title: string): string {
	return title.replace(/\s*\[.*?\]\s*$/, '').trim();
}

export const kinokuniyaSource: ThaiBookSource = {
	name: 'kinokuniya',

	buildSearchUrl(title: string): string {
		const params = new URLSearchParams({
			utf8: '✓',
			is_searching: 'true',
			'restrictBy[available_facet]': 'true',
			keywords: title
		});
		return `${BASE_URL}/products?${params.toString()}`;
	},

	searchSelectors: [
		'#image_or_detail .box .inner_box > a',
		'#image_or_detail .box span.title'
	],

	extractDetailUrl(searchResult: ScrapeResult): string | null {
		const href = getAttribute(searchResult, '#image_or_detail .box .inner_box > a', 'href');
		if (!href) return null;
		return href.startsWith('http') ? href : `${BASE_URL}${href}`;
	},

	detailSelectors: [
		'h1#itemTitle',
		'p.author.search_by_author a',
		'p.long_description',
		'table.bookData td',
		'img[src*="bci.kinokuniya.com"]'
	],

	mapToMetadata(detailResult: ScrapeResult, detailUrl: string): BookMetadata | null {
		const rawTitle = getText(detailResult, 'h1#itemTitle');
		if (!rawTitle) return null;

		const title = stripFormatSuffix(rawTitle);
		const author = getText(detailResult, 'p.author.search_by_author a');
		const description = getText(detailResult, 'p.long_description');
		const thumbnail = getAttribute(detailResult, 'img[src*="bci.kinokuniya.com"]', 'src');

		const tdCells = findSelector(detailResult, 'table.bookData td')?.results ?? [];
		const tdTexts = tdCells.map((c) => c.text.trim()).filter(Boolean);

		let publisher: string | null = null;
		let pageCount: number | null = null;
		let categories: string | null = null;

		for (const text of tdTexts) {
			const pageMatch = /^(\d+)$/.exec(text);
			if (pageMatch && !pageCount) {
				pageCount = parseInt(pageMatch[1], 10);
			} else if (!publisher && text.length > 2 && !/^\d{10,13}$/.test(text)) {
				if (!publisher) publisher = text;
				else if (!categories) categories = text;
			}
		}

		return {
			title,
			author: author ?? 'Unknown',
			publisher,
			publishedDate: null,
			pageCount,
			categories,
			description,
			infoLink: detailUrl,
			thumbnail: thumbnail?.replace('http://', 'https://') ?? null,
			source: 'kinokuniya'
		};
	}
};
