export interface Env {
	AI: Ai;
	GOOGLE_BOOKS_API_KEY?: string | undefined;
	ALLOWED_ORIGIN: string;
	CF_BROWSER_API_TOKEN?: string | undefined;
	CF_ACCOUNT_ID?: string | undefined;
	BOOK_CACHE?: KVNamespace | undefined;
}

export interface ScanRequestBody {
	imageBase64: string;
}

export type BookSource = 'google_books' | 'ai_vision' | 'kinokuniya' | 'naiin' | 'se_ed';

export interface BookIdentification {
	title: string;
	author: string;
	language: string;
}

export interface BookMetadata {
	title: string;
	author: string;
	publisher: string | null;
	publishedDate: string | null;
	pageCount: number | null;
	categories: string | null;
	description: string | null;
	infoLink: string | null;
	thumbnail: string | null;
	source: BookSource;
}

export interface GoogleBooksVolumeInfo {
	title?: string | undefined;
	authors?: string[] | undefined;
	publisher?: string | undefined;
	publishedDate?: string | undefined;
	pageCount?: number | undefined;
	categories?: string[] | undefined;
	description?: string | undefined;
	infoLink?: string | undefined;
	imageLinks?: { thumbnail?: string | undefined } | undefined;
}

export interface GoogleBooksResponse {
	items?: { volumeInfo: GoogleBooksVolumeInfo }[] | undefined;
}

export interface RateLimitEntry {
	count: number;
	resetAt: number;
}

export interface ScrapeRequest {
	url: string;
	elements: { selector: string }[];
	gotoOptions?: { waitUntil?: string; timeout?: number };
}

export interface ScrapeElementResult {
	text: string;
	html: string;
	attributes: { name: string; value: string }[];
	height: number;
	width: number;
	top: number;
	left: number;
}

export interface ScrapeResponse {
	success: boolean;
	result: {
		selector: string;
		results: ScrapeElementResult[];
	}[];
}
