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
						text: 'This is a book cover. Reply ONLY with JSON: {"title":"...","author":"...","language":"..."} where language is an ISO 639-1 code like "en", "th", "ja".'
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
		return buildIdentification(raw.title, raw.author, raw.language);
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
			return buildIdentification(parsed.title, parsed.author, parsed.language);
		}
	} catch {
		// Fall through to regex extraction
	}

	return extractWithRegex(raw);
}

function isBookIdentification(
	value: unknown
): value is { title?: string; author?: string; language?: string } {
	return typeof value === 'object' && value !== null;
}

function buildIdentification(
	title?: string,
	author?: string,
	language?: string
): BookIdentification {
	const t = title ?? 'Unknown';
	return {
		title: t,
		author: author ?? 'Unknown',
		language: language ?? detectLanguage(t)
	};
}

function extractWithRegex(raw: string): BookIdentification {
	const titleMatch = /"title"\s*:\s*"([^"]+)"/.exec(raw);
	const authorMatch = /"author"\s*:\s*"([^"]+)"/.exec(raw);
	const languageMatch = /"language"\s*:\s*"([^"]+)"/.exec(raw);

	return buildIdentification(titleMatch?.[1], authorMatch?.[1], languageMatch?.[1]);
}

const THAI_RANGE = /[\u0E00-\u0E7F]/;

function detectLanguage(text: string): string {
	if (THAI_RANGE.test(text)) return 'th';
	return DEFAULT_LANGUAGE;
}
