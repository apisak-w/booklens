import { describe, it, expect, vi, afterEach } from 'vitest';
import { identifyBook } from '../../src/services/ai';

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

function mockGeminiFailure(error: Error): void {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

describe('identifyBook', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('parses clean JSON with language from AI', async () => {
		mockGeminiResponse('{"title":"Dune","author":"Frank Herbert","language":"en"}');
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			language: 'en',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('parses Thai book JSON with language', async () => {
		mockGeminiResponse('{"title":"เด็กหอ","author":"ปราบดา หยุ่น","language":"th"}');
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'เด็กหอ',
			author: 'ปราบดา หยุ่น',
			language: 'th',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('parses JSON wrapped in markdown code fences', async () => {
		mockGeminiResponse(
			'```json\n{"title":"Dune","author":"Frank Herbert","language":"en"}\n```'
		);
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			language: 'en',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('falls back to regex extraction when JSON parse fails', async () => {
		mockGeminiResponse(
			'The title is "Dune" and the author is "Frank Herbert"... {"title": "Dune", "author": "Frank Herbert", "language": "en"} extra junk'
		);
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			language: 'en',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('defaults language to "en" when AI omits it', async () => {
		mockGeminiResponse('{"title":"Dune","author":"Frank Herbert"}');
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'Dune',
			author: 'Frank Herbert',
			language: 'en',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('returns Unknown with default language when AI response is garbage', async () => {
		mockGeminiResponse('I cannot identify this book');
		const result = await identifyBook('test-key', 'base64data');
		expect(result).toEqual({
			title: 'Unknown',
			author: 'Unknown',
			language: 'en',
			title_confidence: null,
			author_confidence: null,
			language_confidence: null
		});
	});

	it('throws on Gemini API failure', async () => {
		mockGeminiFailure(new Error('Network error'));
		await expect(identifyBook('test-key', 'base64data')).rejects.toThrow('Network error');
	});
});
