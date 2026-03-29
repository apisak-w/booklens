import { describe, it, expect, vi } from 'vitest';
import { getCachedMetadata, setCachedMetadata, buildCacheKey } from '../../src/services/cache';
import type { BookMetadata } from '../../src/types';

function createMockKV(store = new Map<string, string>()): KVNamespace {
	return {
		get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
		put: vi.fn((key: string, value: string) => {
			store.set(key, value);
			return Promise.resolve();
		})
	} as unknown as KVNamespace;
}

const sampleMetadata: BookMetadata = {
	title: 'Dune',
	author: 'Frank Herbert',
	publisher: 'Chilton Books',
	publishedDate: '1965',
	pageCount: 412,
	categories: 'Fiction',
	description: 'A science fiction novel.',
	infoLink: 'https://books.google.com/dune',
	thumbnail: 'https://covers.google.com/dune.jpg',
	source: 'google_books'
};

describe('buildCacheKey', () => {
	it('normalizes title and author to lowercase trimmed key', () => {
		expect(buildCacheKey('  Dune  ', '  Frank Herbert  ')).toBe('dune:frank herbert');
	});

	it('handles Thai text', () => {
		expect(buildCacheKey('เด็กหอ', 'ปราบดา หยุ่น')).toBe('เด็กหอ:ปราบดา หยุ่น');
	});
});

describe('getCachedMetadata', () => {
	it('returns cached metadata on hit', async () => {
		const store = new Map<string, string>([['dune:frank herbert', JSON.stringify(sampleMetadata)]]);
		const kv = createMockKV(store);

		const result = await getCachedMetadata(kv, 'Dune', 'Frank Herbert');
		expect(result).toEqual(sampleMetadata);
	});

	it('returns null on cache miss', async () => {
		const kv = createMockKV();
		const result = await getCachedMetadata(kv, 'Dune', 'Frank Herbert');
		expect(result).toBeNull();
	});

	it('returns null when KV is undefined', async () => {
		const result = await getCachedMetadata(undefined, 'Dune', 'Frank Herbert');
		expect(result).toBeNull();
	});

	it('returns null when KV throws', async () => {
		const kv = { get: vi.fn().mockRejectedValue(new Error('KV error')) } as unknown as KVNamespace;
		const result = await getCachedMetadata(kv, 'Dune', 'Frank Herbert');
		expect(result).toBeNull();
	});
});

describe('setCachedMetadata', () => {
	it('writes metadata to KV with TTL', async () => {
		const kv = createMockKV();
		await setCachedMetadata(kv, 'Dune', 'Frank Herbert', sampleMetadata);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(kv.put).toHaveBeenCalledWith('dune:frank herbert', JSON.stringify(sampleMetadata), {
			expirationTtl: 604800
		});
	});

	it('does nothing when KV is undefined', async () => {
		await setCachedMetadata(undefined, 'Dune', 'Frank Herbert', sampleMetadata);
	});

	it('silently catches KV write errors', async () => {
		const kv = {
			get: vi.fn(),
			put: vi.fn().mockRejectedValue(new Error('KV write error'))
		} as unknown as KVNamespace;

		await setCachedMetadata(kv, 'Dune', 'Frank Herbert', sampleMetadata);
	});
});
