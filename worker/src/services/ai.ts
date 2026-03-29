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
	})) as { response: string };

	return parseAiResponse(aiResponse.response);
}

function parseAiResponse(raw: string): BookIdentification {
	try {
		const cleaned = raw
			.trim()
			.replace(/```json\n?|```/g, '')
			.trim();
		const parsed: unknown = JSON.parse(cleaned);

		if (isBookIdentification(parsed)) {
			return {
				title: parsed.title ?? 'Unknown',
				author: parsed.author ?? 'Unknown',
				language: parsed.language ?? DEFAULT_LANGUAGE
			};
		}
	} catch {
		// Fall through to regex extraction
	}

	return extractWithRegex(raw);
}

function isBookIdentification(value: unknown): value is { title?: string; author?: string; language?: string } {
	return typeof value === 'object' && value !== null;
}

function extractWithRegex(raw: string): BookIdentification {
	const titleMatch = /"title"\s*:\s*"([^"]+)"/.exec(raw);
	const authorMatch = /"author"\s*:\s*"([^"]+)"/.exec(raw);
	const languageMatch = /"language"\s*:\s*"([^"]+)"/.exec(raw);

	return {
		title: titleMatch?.[1] ?? 'Unknown',
		author: authorMatch?.[1] ?? 'Unknown',
		language: languageMatch?.[1] ?? DEFAULT_LANGUAGE
	};
}
