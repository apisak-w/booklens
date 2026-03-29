export interface Env {
	AI: Ai;
	GOOGLE_BOOKS_API_KEY?: string | undefined;
	ALLOWED_ORIGIN: string;
}

export interface ScanRequestBody {
	imageBase64: string;
}

export interface BookIdentification {
	title: string;
	author: string;
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
