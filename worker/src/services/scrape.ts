import type { ScrapeResponse } from '../types';

const SCRAPE_TIMEOUT_MS = 10_000;

export async function scrapePage(
	url: string,
	selectors: string[],
	apiToken: string,
	accountId: string
): Promise<ScrapeResponse['result'] | null> {
	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/scrape`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url,
					elements: selectors.map((selector) => ({ selector })),
					gotoOptions: { waitUntil: 'networkidle0', timeout: SCRAPE_TIMEOUT_MS }
				})
			}
		);

		if (!response.ok) {
			return null;
		}

		const data = await response.json<ScrapeResponse>();

		if (!data.success) {
			return null;
		}

		return data.result;
	} catch {
		return null;
	}
}
