export interface Env {
	GEMINI_API_KEY: string;
	GOOGLE_BOOKS_API_KEY?: string | undefined;
	ALLOWED_ORIGIN: string;
	BOOK_CACHE?: KVNamespace | undefined;
}

export interface ScanRequestBody {
	imageBase64: string;
}

export type BookSource = 'google_books' | 'ai_vision' | 'ai_enriched';

export interface BookIdentification {
	title: string;
	author: string;
	language: string;
	title_confidence: number | null;
	author_confidence: number | null;
	language_confidence: number | null;
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
