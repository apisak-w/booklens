import { describe, it, expect, vi, afterEach } from 'vitest';
import { enrichFromThaiSources } from '../../src/services/thai-books';
import type { BookIdentification, ScrapeResponse } from '../../src/types';

const thaiBook: BookIdentification = { title: 'เด็กหอ', author: 'ปราบดา หยุ่น', language: 'th' };

describe('enrichFromThaiSources', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns ai_vision fallback when scrape credentials missing', async () => {
		const result = await enrichFromThaiSources(thaiBook, undefined, undefined);
		expect(result.source).toBe('ai_vision');
		expect(result.title).toBe('เด็กหอ');
		expect(result.author).toBe('ปราบดา หยุ่น');
	});

	it('returns ai_vision fallback when all sources fail', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
		const result = await enrichFromThaiSources(thaiBook, 'token', 'acct');
		expect(result.source).toBe('ai_vision');
	});

	it('tries sources in order and stops at first match', async () => {
		const naiinSearchResponse: ScrapeResponse = {
			success: true,
			result: [
				{ selector: '.product-list .productitem a.item-img-block', results: [{ text: '', html: '', attributes: [{ name: 'href', value: '/product/detail/12345' }], height: 0, width: 0, top: 0, left: 0 }] },
				{ selector: '.product-list .productitem a.itemname', results: [{ text: 'เด็กหอ', html: 'เด็กหอ', attributes: [], height: 0, width: 0, top: 0, left: 0 }] }
			]
		};

		const naiinDetailResponse: ScrapeResponse = {
			success: true,
			result: [
				{ selector: 'h1.product-name', results: [{ text: 'เด็กหอ', html: 'เด็กหอ', attributes: [], height: 0, width: 0, top: 0, left: 0 }] },
				{ selector: 'a.link-book-detail[href*="/writer/"]', results: [{ text: 'ปราบดา หยุ่น', html: 'ปราบดา หยุ่น', attributes: [], height: 0, width: 0, top: 0, left: 0 }] },
				{ selector: 'a.link-book-detail[href*="/publisher/"]', results: [{ text: 'Salmon', html: 'Salmon', attributes: [], height: 0, width: 0, top: 0, left: 0 }] },
				{ selector: 'div[data-tab-content="1"] p', results: [{ text: 'A novel', html: 'A novel', attributes: [], height: 0, width: 0, top: 0, left: 0 }] },
				{ selector: '.product-label', results: [] },
				{ selector: '.product-label-detail', results: [] },
				{ selector: 'img.img-gallery', results: [] }
			]
		};

		let callIndex = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => {
				callIndex++;
				if (callIndex === 1) {
					// Kinokuniya search fails
					return Promise.resolve(new Response('', { status: 500 }));
				}
				if (callIndex === 2) {
					// Naiin search succeeds
					return Promise.resolve(new Response(JSON.stringify(naiinSearchResponse)));
				}
				if (callIndex === 3) {
					// Naiin detail succeeds
					return Promise.resolve(new Response(JSON.stringify(naiinDetailResponse)));
				}
				return Promise.resolve(new Response('', { status: 500 }));
			})
		);

		const result = await enrichFromThaiSources(thaiBook, 'token', 'acct');
		expect(result.source).toBe('naiin');
		expect(result.title).toBe('เด็กหอ');

		// Should have made 3 fetch calls (kino search, naiin search, naiin detail)
		expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
	});
});
