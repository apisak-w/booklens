import { describe, it, expect, vi } from 'vitest';
import { enrichWithAi } from '../../src/services/ai-enrich';
import type { BookIdentification } from '../../src/types';

const thaiBook: BookIdentification = { title: 'เด็กหอ', author: 'ปราบดา หยุ่น', language: 'th' };

function createMockAi(response: string): Ai {
	return {
		run: vi.fn().mockResolvedValue({ response })
	} as unknown as Ai;
}

describe('enrichWithAi', () => {
	it('returns enriched metadata from AI response', async () => {
		const ai = createMockAi(
			'{"publisher":"Salmon Books","publishedDate":"2003","pageCount":200,"categories":"วรรณกรรม","description":"นวนิยายเกี่ยวกับชีวิตนักศึกษา"}'
		);

		const result = await enrichWithAi(ai, thaiBook);

		expect(result.title).toBe('เด็กหอ');
		expect(result.author).toBe('ปราบดา หยุ่น');
		expect(result.publisher).toBe('Salmon Books');
		expect(result.publishedDate).toBe('2003');
		expect(result.pageCount).toBe(200);
		expect(result.categories).toBe('วรรณกรรม');
		expect(result.description).toContain('นักศึกษา');
		expect(result.infoLink).toBeNull();
		expect(result.thumbnail).toBeNull();
		expect(result.source).toBe('ai_enriched');
	});

	it('handles JSON wrapped in code fences', async () => {
		const ai = createMockAi(
			'```json\n{"publisher":"Salmon","publishedDate":"2003","pageCount":200,"categories":"Fiction","description":"A novel."}\n```'
		);

		const result = await enrichWithAi(ai, thaiBook);
		expect(result.source).toBe('ai_enriched');
		expect(result.publisher).toBe('Salmon');
	});

	it('preserves title and author from identification, not AI', async () => {
		const ai = createMockAi(
			'{"publisher":"Test","publishedDate":"2000","pageCount":100,"categories":"Test","description":"Test"}'
		);

		const result = await enrichWithAi(ai, thaiBook);
		expect(result.title).toBe('เด็กหอ');
		expect(result.author).toBe('ปราบดา หยุ่น');
	});

	it('returns ai_vision fallback when AI returns garbage', async () => {
		const ai = createMockAi('I do not know this book.');

		const result = await enrichWithAi(ai, thaiBook);
		expect(result.source).toBe('ai_vision');
		expect(result.title).toBe('เด็กหอ');
		expect(result.publisher).toBeNull();
	});

	it('returns ai_vision fallback when AI throws', async () => {
		const ai = {
			run: vi.fn().mockRejectedValue(new Error('AI unavailable'))
		} as unknown as Ai;

		const result = await enrichWithAi(ai, thaiBook);
		expect(result.source).toBe('ai_vision');
		expect(result.title).toBe('เด็กหอ');
	});

	it('handles partial metadata with null for missing fields', async () => {
		const ai = createMockAi('{"publisher":"Salmon Books","description":"A novel about students."}');

		const result = await enrichWithAi(ai, thaiBook);
		expect(result.source).toBe('ai_enriched');
		expect(result.publisher).toBe('Salmon Books');
		expect(result.publishedDate).toBeNull();
		expect(result.pageCount).toBeNull();
		expect(result.categories).toBeNull();
	});
});
