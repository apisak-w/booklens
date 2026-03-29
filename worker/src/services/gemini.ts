const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite';

interface GeminiPart {
	text?: string;
	inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
	candidates?: { content: { parts: { text: string }[] } }[];
}

async function callGemini(apiKey: string, parts: GeminiPart[]): Promise<string> {
	const url = `${GEMINI_BASE_URL}:generateContent?key=${apiKey}`;
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ parts }]
		})
	});

	if (!response.ok) {
		const body = await response.text();
		console.error(`[gemini] API error ${response.status}: ${body}`);
		throw new Error(`Gemini API error ${response.status}`);
	}

	const data = (await response.json()) as GeminiResponse;
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

	if (text === undefined) {
		console.error(`[gemini] no candidates in response: ${JSON.stringify(data)}`);
		throw new Error('Gemini API returned no candidates');
	}

	return text;
}

export async function geminiVision(
	apiKey: string,
	prompt: string,
	imageBase64: string
): Promise<string> {
	return callGemini(apiKey, [
		{ text: prompt },
		{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
	]);
}

export async function geminiText(apiKey: string, prompt: string): Promise<string> {
	return callGemini(apiKey, [{ text: prompt }]);
}
