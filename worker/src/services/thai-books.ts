import type { BookIdentification, BookMetadata } from '../types';
import type { ThaiBookSource } from './sources/types';
import { scrapePage } from './scrape';
import { kinokuniyaSource } from './sources/kinokuniya';
import { naiinSource } from './sources/naiin';
import { seedSource } from './sources/se-ed';

const SOURCES: ThaiBookSource[] = [kinokuniyaSource, naiinSource, seedSource];

export async function enrichFromThaiSources(
	identification: BookIdentification,
	apiToken: string | undefined,
	accountId: string | undefined
): Promise<BookMetadata> {
	if (!apiToken || !accountId) {
		return buildFallback(identification);
	}

	for (const source of SOURCES) {
		const metadata = await trySource(source, identification.title, apiToken, accountId);
		if (metadata) return metadata;
	}

	return buildFallback(identification);
}

async function trySource(
	source: ThaiBookSource,
	title: string,
	apiToken: string,
	accountId: string
): Promise<BookMetadata | null> {
	// Step 1: Search
	const searchUrl = source.buildSearchUrl(title);
	const searchResult = await scrapePage(searchUrl, source.searchSelectors, apiToken, accountId);
	if (!searchResult) return null;

	// Step 2: Extract detail URL from search results
	const detailUrl = source.extractDetailUrl(searchResult);
	if (!detailUrl) return null;

	// Step 3: Scrape detail page
	const detailResult = await scrapePage(detailUrl, source.detailSelectors, apiToken, accountId);
	if (!detailResult) return null;

	// Step 4: Map to metadata
	return source.mapToMetadata(detailResult, detailUrl);
}

function buildFallback(identification: BookIdentification): BookMetadata {
	return {
		title: identification.title,
		author: identification.author,
		publisher: null,
		publishedDate: null,
		pageCount: null,
		categories: null,
		description: null,
		infoLink: null,
		thumbnail: null,
		source: 'ai_vision'
	};
}
