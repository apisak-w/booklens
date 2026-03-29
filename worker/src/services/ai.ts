import type { BookIdentification } from '../types';

const AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_TOKENS = 150;
const DEFAULT_LANGUAGE = 'en';

export async function identifyBook(ai: Ai, imageBase64: string): Promise<BookIdentification> {
	const aiResponse = (await ai.run(AI_MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'This is a book cover. Reply ONLY with JSON: {"title":"...","author":"..."}'
					},
					{
						type: 'image_url',
						image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
					}
				]
			}
		],
		max_tokens: MAX_TOKENS
	})) as { response: unknown };

	const raw = aiResponse.response;
	console.log(`[ai] raw response: ${JSON.stringify(raw)}`);
	return parseAiResponse(raw);
}

function parseAiResponse(raw: unknown): BookIdentification {
	// Handle case where Workers AI returns a parsed object directly
	if (typeof raw === 'object' && raw !== null && isBookIdentification(raw)) {
		const title = raw.title ?? 'Unknown';
		const author = raw.author ?? 'Unknown';
		return { title, author, language: detectLanguage(title) };
	}

	if (typeof raw !== 'string') {
		return { title: 'Unknown', author: 'Unknown', language: DEFAULT_LANGUAGE };
	}

	try {
		const cleaned = raw
			.trim()
			.replace(/```json\n?|```/g, '')
			.trim();
		const parsed: unknown = JSON.parse(cleaned);

		if (isBookIdentification(parsed)) {
			const title = parsed.title ?? 'Unknown';
			const author = parsed.author ?? 'Unknown';
			return { title, author, language: detectLanguage(title) };
		}
	} catch {
		// Fall through to regex extraction
	}

	return extractWithRegex(raw);
}

function isBookIdentification(value: unknown): value is { title?: string; author?: string } {
	return typeof value === 'object' && value !== null;
}

function extractWithRegex(raw: string): BookIdentification {
	const titleMatch = /"title"\s*:\s*"([^"]+)"/.exec(raw);
	const authorMatch = /"author"\s*:\s*"([^"]+)"/.exec(raw);
	const title = titleMatch?.[1] ?? 'Unknown';

	return {
		title,
		author: authorMatch?.[1] ?? 'Unknown',
		language: detectLanguage(title)
	};
}

const THAI_RANGE = /[\u0E00-\u0E7F]/;

function detectLanguage(text: string): string {
	if (THAI_RANGE.test(text)) return 'th';
	return DEFAULT_LANGUAGE;
}
