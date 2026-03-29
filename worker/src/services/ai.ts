import type { BookIdentification } from '../types';

const AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_TOKENS = 200;
const DEFAULT_LANGUAGE = 'en';

const IDENTIFICATION_PROMPT = `Look at this book cover image carefully. Read the large text on the cover to find the book title, and read the author name (usually near the top or bottom of the cover).

Rules:
- The TITLE is the largest, most prominent text on the cover
- The AUTHOR name is usually smaller, often at the top or bottom
- Ignore quotes, reviews, "bestseller" badges, and publisher names
- If you cannot read the text clearly, respond with "Unknown"
- Do NOT guess or make up a title — only report what you can actually read

Reply ONLY with this JSON format, no other text:
{"title":"exact title from cover","author":"exact author from cover","language":"xx"}

where language is the ISO 639-1 code of the text on the cover (en, th, ja, etc).`;

export async function identifyBook(ai: Ai, imageBase64: string): Promise<BookIdentification> {
	const aiResponse = (await ai.run(AI_MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: IDENTIFICATION_PROMPT
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

function isBookIdentification(
	value: unknown
): value is { title?: string; author?: string; language?: string } {
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
