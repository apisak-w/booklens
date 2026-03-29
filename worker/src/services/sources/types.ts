import type { BookMetadata, ScrapeResponse } from '../../types';

export type ScrapeResult = ScrapeResponse['result'];

export interface ThaiBookSource {
	name: BookMetadata['source'];
	buildSearchUrl: (title: string) => string;
	searchSelectors: string[];
	extractDetailUrl: (searchResult: ScrapeResult) => string | null;
	detailSelectors: string[];
	mapToMetadata: (detailResult: ScrapeResult, detailUrl: string) => BookMetadata | null;
}
