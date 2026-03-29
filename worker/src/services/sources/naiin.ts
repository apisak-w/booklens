import type { ThaiBookSource, ScrapeResult } from './types';
import type { BookMetadata } from '../../types';

const BASE_URL = 'https://www.naiin.com';

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

function parseLabelValuePairs(result: ScrapeResult): Map<string, string> {
	const labels = findSelector(result, '.product-label')?.results ?? [];
	const values = findSelector(result, '.product-label-detail')?.results ?? [];
	const map = new Map<string, string>();

	for (let i = 0; i < labels.length && i < values.length; i++) {
		const key = labels[i]!.text.trim();
		const val = values[i]!.text.trim();
		if (key && val) map.set(key, val);
	}

	return map;
}

export const naiinSource: ThaiBookSource = {
	name: 'naiin',

	buildSearchUrl(title: string): string {
		return `${BASE_URL}/search-result?title=${encodeURIComponent(title)}`;
	},

	searchSelectors: [
		'.product-list .productitem a.item-img-block',
		'.product-list .productitem a.itemname'
	],

	extractDetailUrl(searchResult: ScrapeResult): string | null {
		const href = getAttribute(searchResult, '.product-list .productitem a.item-img-block', 'href');
		if (!href) return null;
		return href.startsWith('http') ? href : `${BASE_URL}${href}`;
	},

	detailSelectors: [
		'h1.product-name',
		'a.link-book-detail[href*="/writer/"]',
		'a.link-book-detail[href*="/publisher/"]',
		'div[data-tab-content="1"] p',
		'.product-label',
		'.product-label-detail',
		'img.img-gallery'
	],

	mapToMetadata(detailResult: ScrapeResult, detailUrl: string): BookMetadata | null {
		const title = getText(detailResult, 'h1.product-name');
		if (!title) return null;

		const author = getText(detailResult, 'a.link-book-detail[href*="/writer/"]');
		const publisher = getText(detailResult, 'a.link-book-detail[href*="/publisher/"]');
		const description = getText(detailResult, 'div[data-tab-content="1"] p');
		const thumbnail = getAttribute(detailResult, 'img.img-gallery', 'src');

		const labelValues = parseLabelValuePairs(detailResult);
		const pagesText = labelValues.get('จำนวนหน้า');
		const pageCount = pagesText ? parseInt(pagesText.replace(/[^\d]/g, ''), 10) || null : null;
		const categories = labelValues.get('หมวดหมู่') ?? null;

		return {
			title,
			author: author ?? 'Unknown',
			publisher,
			publishedDate: null,
			pageCount,
			categories,
			description,
			infoLink: detailUrl,
			thumbnail,
			source: 'naiin'
		};
	}
};
