import type { ThaiBookSource, ScrapeResult } from './types';
import type { BookMetadata } from '../../types';

function findSelector(result: ScrapeResult, selector: string) {
	return result.find((r) => r.selector === selector);
}

function parseJsonLdScripts(result: ScrapeResult): unknown[] {
	const scripts = findSelector(result, 'script[type="application/ld+json"]')?.results ?? [];
	const parsed: unknown[] = [];
	for (const script of scripts) {
		try {
			parsed.push(JSON.parse(script.text));
		} catch {
			// skip invalid JSON-LD
		}
	}
	return parsed;
}

function findJsonLdByType(jsonLdItems: unknown[], type: string): Record<string, unknown> | null {
	for (const item of jsonLdItems) {
		if (typeof item === 'object' && item !== null && '@type' in item && (item as Record<string, unknown>)['@type'] === type) {
			return item as Record<string, unknown>;
		}
	}
	return null;
}

function extractFromRichText(result: ScrapeResult, label: string): string | null {
	const paragraphs = findSelector(result, 'p.mpe-theme-paragraph')?.results ?? [];
	for (const p of paragraphs) {
		const text = p.text.trim();
		const pattern = new RegExp(`${label}\\s*:?\\s*(.+)`, 'i');
		const match = pattern.exec(text);
		if (match) return match[1].trim();
	}
	return null;
}

function extractPageCount(result: ScrapeResult): number | null {
	const paragraphs = findSelector(result, 'p.mpe-theme-paragraph')?.results ?? [];
	for (const p of paragraphs) {
		const match = /(\d+)\s*หน้า/.exec(p.text);
		if (match) return parseInt(match[1], 10);
	}
	return null;
}

export const seedSource: ThaiBookSource = {
	name: 'se_ed',

	buildSearchUrl(title: string): string {
		return `https://www.se-ed.com/search?filter.keyword=${encodeURIComponent(title)}`;
	},

	searchSelectors: [
		'script[type="application/ld+json"]'
	],

	extractDetailUrl(searchResult: ScrapeResult): string | null {
		const jsonLdItems = parseJsonLdScripts(searchResult);
		const itemList = findJsonLdByType(jsonLdItems, 'ItemList');
		if (!itemList) return null;

		const elements = itemList['itemListElement'] as { url?: string }[] | undefined;
		const firstItem = elements?.[0];
		return firstItem?.url ?? null;
	},

	detailSelectors: [
		'script[type="application/ld+json"]',
		'p.mpe-theme-paragraph'
	],

	mapToMetadata(detailResult: ScrapeResult, detailUrl: string): BookMetadata | null {
		const jsonLdItems = parseJsonLdScripts(detailResult);
		const product = findJsonLdByType(jsonLdItems, 'Product');
		if (!product || !product['name']) return null;

		const breadcrumb = findJsonLdByType(jsonLdItems, 'BreadcrumbList');
		const breadcrumbItems = (breadcrumb?.['itemListElement'] as { item?: { name?: string } }[] | undefined) ?? [];
		const categories = breadcrumbItems.length > 1
			? (breadcrumbItems[breadcrumbItems.length - 1]?.item?.name ?? null)
			: null;

		const author = extractFromRichText(detailResult, 'ผู้เขียน');
		const publisher = extractFromRichText(detailResult, 'สำนักพิมพ์');
		const pageCount = extractPageCount(detailResult);

		return {
			title: product['name'] as string,
			author: author ?? 'Unknown',
			publisher,
			publishedDate: null,
			pageCount,
			categories,
			description: (product['description'] as string) ?? null,
			infoLink: detailUrl,
			thumbnail: (product['image'] as string) ?? null,
			source: 'se_ed'
		};
	}
};
