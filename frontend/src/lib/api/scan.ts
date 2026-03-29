import { PUBLIC_WORKER_URL } from '$env/static/public';
import type { ScanResponse } from '$lib/types';

export async function scanBookCover(imageBase64: string): Promise<ScanResponse> {
	const res = await fetch(PUBLIC_WORKER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ imageBase64 })
	});

	const data: ScanResponse = await res.json();

	if (data.error) {
		throw new Error(data.error);
	}

	return data;
}
