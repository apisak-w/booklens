import { describe, it, expect, vi, afterEach } from 'vitest';
import { enrichWithAi } from '../../src/services/ai-enrich';
import type { BookIdentification } from '../../src/types';

const thaiBook: BookIdentification = {
	title: 'เด็กหอ',
	author: 'ปราบดา หยุ่น',
	language: 'th',
	title_confidence: null,
	author_confidence: null,
	language_confidence: null
};

function mockGeminiResponse(text: string): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					candidates: [{ content: { parts: [{ text }] } }]
				})
			)
		)
	);
}

describe('enrichWithAi', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns enriched metadata from AI response', async () => {
		mockGeminiResponse(
			'{"publisher":"Salmon Books","publishedDate":"2003","pageCount":200,"categories":"วรรณกรรม","description":"นวนิยายเกี่ยวกับชีวิตนักศึกษา"}'
		);

		const result = await enrichWithAi('test-key', thaiBook);

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
		mockGeminiResponse(
			'```json\n{"publisher":"Salmon","publishedDate":"2003","pageCount":200,"categories":"Fiction","description":"A novel."}\n```'
		);

		const result = await enrichWithAi('test-key', thaiBook);
		expect(result.source).toBe('ai_enriched');
		expect(result.publisher).toBe('Salmon');
	});

	it('preserves title and author from identification, not AI', async () => {
		mockGeminiResponse(
			'{"publisher":"Test","publishedDate":"2000","pageCount":100,"categories":"Test","description":"Test"}'
		);

		const result = await enrichWithAi('test-key', thaiBook);
		expect(result.title).toBe('เด็กหอ');
		expect(result.author).toBe('ปราบดา หยุ่น');
	});

	it('returns ai_vision fallback when AI returns garbage', async () => {
		mockGeminiResponse('I do not know this book.');

		const result = await enrichWithAi('test-key', thaiBook);
		expect(result.source).toBe('ai_vision');
		expect(result.title).toBe('เด็กหอ');
		expect(result.publisher).toBeNull();
	});

	it('returns ai_vision fallback when Gemini throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const result = await enrichWithAi('test-key', thaiBook);
		expect(result.source).toBe('ai_vision');
		expect(result.title).toBe('เด็กหอ');
	});

	it('handles partial metadata with null for missing fields', async () => {
		mockGeminiResponse('{"publisher":"Salmon Books","description":"A novel about students."}');

		const result = await enrichWithAi('test-key', thaiBook);
		expect(result.source).toBe('ai_enriched');
		expect(result.publisher).toBe('Salmon Books');
		expect(result.publishedDate).toBeNull();
		expect(result.pageCount).toBeNull();
		expect(result.categories).toBeNull();
	});
});
