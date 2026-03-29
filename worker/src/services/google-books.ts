import type { BookIdentification, BookMetadata, GoogleBooksResponse } from '../types.js';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export async function enrichBookMetadata(
	identification: BookIdentification,
	apiKey: string | undefined
): Promise<BookMetadata> {
	const fallback = buildFallbackMetadata(identification);

	try {
		const url = buildSearchUrl(identification, apiKey);
		const response = await fetch(url);
		const data = await response.json<GoogleBooksResponse>();
		const firstItem = data.items?.[0];

		if (!firstItem) {
			return fallback;
		}

		const vol = firstItem.volumeInfo;
		return {
			title: vol.title ?? identification.title,
			author: vol.authors?.join(', ') ?? identification.author,
			publisher: vol.publisher ?? null,
			publishedDate: vol.publishedDate ?? null,
			pageCount: vol.pageCount ?? null,
			categories: vol.categories?.[0] ?? null,
			description: vol.description ?? null,
			infoLink: vol.infoLink ?? null,
			thumbnail: upgradeThumbnailUrl(vol.imageLinks?.thumbnail)
		};
	} catch {
		return fallback;
	}
}

function buildSearchUrl(identification: BookIdentification, apiKey: string | undefined): string {
	const query = encodeURIComponent(`${identification.title} ${identification.author}`);
	const keyParam = apiKey !== undefined ? `&key=${apiKey}` : '';
	return `${GOOGLE_BOOKS_API}?q=${query}&maxResults=1${keyParam}`;
}

function upgradeThumbnailUrl(url: string | undefined): string | null {
	if (url === undefined) {
		return null;
	}
	return url.replace('http://', 'https://');
}

function buildFallbackMetadata(identification: BookIdentification): BookMetadata {
	return {
		title: identification.title,
		author: identification.author,
		publisher: null,
		publishedDate: null,
		pageCount: null,
		categories: null,
		description: null,
		infoLink: null,
		thumbnail: null
	};
}
