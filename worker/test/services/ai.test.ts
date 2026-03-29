import { describe, it, expect, vi } from 'vitest';
import { identifyBook } from '../../src/services/ai';

function createMockAi(response: string): Ai {
	return {
		run: vi.fn().mockResolvedValue({ response })
	} as unknown as Ai;
}

function createFailingAi(error: Error): Ai {
	return {
		run: vi.fn().mockRejectedValue(error)
	} as unknown as Ai;
}

describe('identifyBook', () => {
	it('parses clean JSON with language from AI', async () => {
		const ai = createMockAi('{"title":"Dune","author":"Frank Herbert","language":"en"}');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert', language: 'en' });
	});

	it('parses Thai book JSON with language', async () => {
		const ai = createMockAi('{"title":"เด็กหอ","author":"ปราบดา หยุ่น","language":"th"}');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'เด็กหอ', author: 'ปราบดา หยุ่น', language: 'th' });
	});

	it('parses JSON wrapped in markdown code fences', async () => {
		const ai = createMockAi('```json\n{"title":"Dune","author":"Frank Herbert","language":"en"}\n```');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert', language: 'en' });
	});

	it('falls back to regex extraction when JSON parse fails', async () => {
		const ai = createMockAi(
			'The title is "Dune" and the author is "Frank Herbert"... {"title": "Dune", "author": "Frank Herbert", "language": "en"} extra junk'
		);
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert', language: 'en' });
	});

	it('defaults language to "en" when AI omits it', async () => {
		const ai = createMockAi('{"title":"Dune","author":"Frank Herbert"}');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert', language: 'en' });
	});

	it('returns Unknown with default language when AI response is garbage', async () => {
		const ai = createMockAi('I cannot identify this book');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Unknown', author: 'Unknown', language: 'en' });
	});

	it('throws on AI binding failure', async () => {
		const ai = createFailingAi(new Error('AI unavailable'));
		await expect(identifyBook(ai, 'base64data')).rejects.toThrow('AI unavailable');
	});
});
