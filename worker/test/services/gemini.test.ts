import { describe, it, expect, vi, afterEach } from 'vitest';
import { geminiVision, geminiText } from '../../src/services/gemini';

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

describe('geminiVision', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends image as inlineData and returns response text', async () => {
		mockGeminiResponse('{"title":"Dune"}');

		const result = await geminiVision('test-key', 'Identify this book', 'base64data');

		expect(result).toBe('{"title":"Dune"}');

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalledOnce();

		const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
		expect(calledUrl).toContain('gemini-2.5-flash-lite');
		expect(calledUrl).toContain('key=test-key');

		const calledInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(calledInit.body as string);
		expect(body.contents[0].parts).toHaveLength(2);
		expect(body.contents[0].parts[0].text).toBe('Identify this book');
		expect(body.contents[0].parts[1].inlineData.mimeType).toBe('image/jpeg');
		expect(body.contents[0].parts[1].inlineData.data).toBe('base64data');
	});

	it('throws on HTTP error', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('{"error":"bad request"}', { status: 400 }))
		);

		await expect(geminiVision('test-key', 'prompt', 'img')).rejects.toThrow(
			'Gemini API error 400'
		);
	});

	it('throws when response has no candidates', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify({})))
		);

		await expect(geminiVision('test-key', 'prompt', 'img')).rejects.toThrow(
			'Gemini API returned no candidates'
		);
	});
});

describe('geminiText', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends text-only request and returns response text', async () => {
		mockGeminiResponse('{"publisher":"Chilton"}');

		const result = await geminiText('test-key', 'Enrich this book');

		expect(result).toBe('{"publisher":"Chilton"}');

		const fetchMock = vi.mocked(fetch);
		const calledInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(calledInit.body as string);
		expect(body.contents[0].parts).toHaveLength(1);
		expect(body.contents[0].parts[0].text).toBe('Enrich this book');
	});
});
