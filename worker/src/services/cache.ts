import type { BookMetadata } from '../types';

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function buildCacheKey(title: string, author: string): string {
	return `${title.trim().toLowerCase()}:${author.trim().toLowerCase()}`;
}

export async function getCachedMetadata(
	kv: KVNamespace | undefined,
	title: string,
	author: string
): Promise<BookMetadata | null> {
	if (!kv) return null;

	try {
		const cached = await kv.get(buildCacheKey(title, author));
		if (!cached) return null;
		return JSON.parse(cached) as BookMetadata;
	} catch {
		return null;
	}
}

export async function setCachedMetadata(
	kv: KVNamespace | undefined,
	title: string,
	author: string,
	metadata: BookMetadata
): Promise<void> {
	if (!kv) return;

	try {
		await kv.put(buildCacheKey(title, author), JSON.stringify(metadata), {
			expirationTtl: CACHE_TTL_SECONDS
		});
	} catch {
		// Silent failure — caching is best-effort
	}
}
