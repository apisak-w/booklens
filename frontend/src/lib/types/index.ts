export type BookSource = 'google_books' | 'ai_vision' | 'kinokuniya' | 'naiin' | 'se_ed';

export interface BookResult {
	title: string;
	author: string;
	publisher: string | null;
	publishedDate: string | null;
	pageCount: number | null;
	categories: string | null;
	description: string | null;
	infoLink: string | null;
	thumbnail: string | null;
	source?: BookSource;
}

export interface ScanResponse extends BookResult {
	error?: string;
	debug?: Record<string, unknown>;
}

export type AppState = 'empty' | 'loading' | 'result' | 'error';
