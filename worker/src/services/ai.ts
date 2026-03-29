import type { BookIdentification } from '../types';
import { geminiVision } from './gemini';

const DEFAULT_LANGUAGE = 'en';
const BOOK_IDENTIFICATION_PROMPT = `
You are analyzing a book cover image. Your task is to extract bibliographic metadata visible on the cover.

Follow these rules strictly:
1. TITLE: Extract the main title exactly as printed. If there is a subtitle, append it after a colon. Ignore series names, taglines, and publisher names.
2. AUTHOR: Extract the author name exactly as printed. If multiple authors, join with " & ". If no author is visible, use null.
3. LANGUAGE: Detect the language of the title text and return its ISO 639-1 code (e.g. "en", "th", "ja", "zh", "fr"). Do NOT default to "en" — read the actual script.
4. CONFIDENCE: For each field, rate your confidence from 0.0 to 1.0:
    - 1.0 = clearly visible and unambiguous
    - 0.7–0.9 = mostly clear but partially obscured or stylized font
    - 0.4–0.6 = uncertain, text is small, blurry, or ambiguous
    - 0.0–0.3 = guessed or inferred, not clearly readable
5. If confidence for a field is below 0.4, set the field value to null.

Reply ONLY with a single valid JSON object, no explanation, no markdown:
{"title":"...","title_confidence":0.0,"author":"...","author_confidence":0.0,"language":"...","language_confidence":0.0}
`;

export async function identifyBook(
	apiKey: string,
	imageBase64: string
): Promise<BookIdentification> {
	const raw = await geminiVision(apiKey, BOOK_IDENTIFICATION_PROMPT, imageBase64);
	console.log(`[ai] raw response: ${JSON.stringify(raw)}`);
	return parseAiResponse(raw);
}

function parseAiResponse(raw: string): BookIdentification {
	try {
		const cleaned = raw
			.trim()
			.replace(/```json\n?|```/g, '')
			.trim();
		const parsed: unknown = JSON.parse(cleaned);

		if (isBookIdentification(parsed)) {
			return buildIdentification(parsed);
		}
	} catch {
		// Fall through to regex extraction
	}

	return extractWithRegex(raw);
}

function isBookIdentification(value: unknown): value is {
	title?: string;
	author?: string;
	language?: string;
	title_confidence?: unknown;
	author_confidence?: unknown;
	language_confidence?: unknown;
} {
	return typeof value === 'object' && value !== null;
}

function buildIdentification(parsed: {
	title?: string;
	author?: string;
	language?: string;
	title_confidence?: unknown;
	author_confidence?: unknown;
	language_confidence?: unknown;
}): BookIdentification {
	const result: BookIdentification = {
		title: parsed.title ?? 'Unknown',
		author: parsed.author ?? 'Unknown',
		language: parsed.language ?? DEFAULT_LANGUAGE,
		title_confidence: parseConfidence(parsed.title_confidence),
		author_confidence: parseConfidence(parsed.author_confidence),
		language_confidence: parseConfidence(parsed.language_confidence)
	};
	console.log(JSON.stringify({ ai_identification: result }));
	return result;
}

function parseConfidence(value: unknown): number | null {
	if (typeof value === 'number' && value >= 0 && value <= 1) {
		return value;
	}
	return null;
}

function extractWithRegex(raw: string): BookIdentification {
	const titleMatch = /"title"\s*:\s*"([^"]+)"/.exec(raw);
	const authorMatch = /"author"\s*:\s*"([^"]+)"/.exec(raw);
	const languageMatch = /"language"\s*:\s*"([^"]+)"/.exec(raw);

	return {
		title: titleMatch?.[1] ?? 'Unknown',
		author: authorMatch?.[1] ?? 'Unknown',
		language: languageMatch?.[1] ?? DEFAULT_LANGUAGE,
		title_confidence: null,
		author_confidence: null,
		language_confidence: null
	};
}
