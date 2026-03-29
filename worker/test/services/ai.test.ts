import { describe, it, expect, vi } from 'vitest';
import { identifyBook } from '../../src/services/ai.js';

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
	it('parses clean JSON from AI', async () => {
		const ai = createMockAi('{"title":"Dune","author":"Frank Herbert"}');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('parses JSON wrapped in markdown code fences', async () => {
		const ai = createMockAi('```json\n{"title":"Dune","author":"Frank Herbert"}\n```');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('falls back to regex extraction when JSON parse fails', async () => {
		const ai = createMockAi('The title is "Dune" and the author is "Frank Herbert"... {"title": "Dune", "author": "Frank Herbert"} extra junk');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Dune', author: 'Frank Herbert' });
	});

	it('returns Unknown when AI response is garbage', async () => {
		const ai = createMockAi('I cannot identify this book');
		const result = await identifyBook(ai, 'base64data');
		expect(result).toEqual({ title: 'Unknown', author: 'Unknown' });
	});

	it('throws on AI binding failure', async () => {
		const ai = createFailingAi(new Error('AI unavailable'));
		await expect(identifyBook(ai, 'base64data')).rejects.toThrow('AI unavailable');
	});
});
