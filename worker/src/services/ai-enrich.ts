import type { BookIdentification, BookMetadata } from '../types';

const AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_TOKENS = 500;

export async function enrichWithAi(
	ai: Ai,
	identification: BookIdentification
): Promise<BookMetadata> {
	const fallback = buildFallback(identification);

	try {
		const aiResponse = (await ai.run(AI_MODEL, {
			messages: [
				{
					role: 'user',
					content: `You are a book metadata expert. I identified a book from its cover:
Title: "${identification.title}"
Author: "${identification.author}"
Language: "${identification.language}"

Reply ONLY with JSON containing what you know about this book:
{"publisher":"...","publishedDate":"YYYY","pageCount":123,"categories":"...","description":"..."}`
				}
			],
			max_tokens: MAX_TOKENS
		})) as { response: string };

		return parseEnrichmentResponse(aiResponse.response, identification);
	} catch {
		return fallback;
	}
}

function parseEnrichmentResponse(raw: string, identification: BookIdentification): BookMetadata {
	try {
		const cleaned = raw
			.trim()
			.replace(/```json\n?|```/g, '')
			.trim();
		const parsed = JSON.parse(cleaned) as Record<string, unknown>;

		return {
			title: identification.title,
			author: identification.author,
			publisher: typeof parsed.publisher === 'string' ? parsed.publisher : null,
			publishedDate: typeof parsed.publishedDate === 'string' ? parsed.publishedDate : null,
			pageCount: typeof parsed.pageCount === 'number' ? parsed.pageCount : null,
			categories: typeof parsed.categories === 'string' ? parsed.categories : null,
			description: typeof parsed.description === 'string' ? parsed.description : null,
			infoLink: null,
			thumbnail: null,
			source: 'ai_enriched'
		};
	} catch {
		return buildFallback(identification);
	}
}

function buildFallback(identification: BookIdentification): BookMetadata {
	return {
		title: identification.title,
		author: identification.author,
		publisher: null,
		publishedDate: null,
		pageCount: null,
		categories: null,
		description: null,
		infoLink: null,
		thumbnail: null,
		source: 'ai_vision'
	};
}
