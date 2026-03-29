<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import ButtonRow from '$lib/components/ButtonRow.svelte';
	import LoadingSteps from '$lib/components/LoadingSteps.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { scanBookCover } from '$lib/api/scan';
	import type { AppState, BookResult } from '$lib/types';

	let appState: AppState = $state('empty');
	let imageBase64: string | null = $state(null);
	let previewUrl: string | null = $state(null);
	let result: BookResult | null = $state(null);
	let errorMessage: string = $state('');
	let hasResult = $derived((appState as AppState) === 'result');

	function handleFile(base64: string, preview: string) {
		imageBase64 = base64;
		previewUrl = preview;
		appState = 'empty';
	}

	function handleClear() {
		imageBase64 = null;
		previewUrl = null;
		result = null;
		errorMessage = '';
		appState = 'empty';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function handleScan() {
		if (!imageBase64) return;
		appState = 'loading';

		try {
			result = await scanBookCover(imageBase64);
			// Small delay to let the last loading step animate
			setTimeout(() => {
				appState = 'result';
			}, 400);
		} catch (err) {
			errorMessage =
				'Could not identify this book. ' +
				((err as Error).message || 'Please try a clearer image.');
			appState = 'error';
		}
	}
</script>

<main class:has-result={hasResult}>
	<div class="upload-panel">
		<DropZone {previewUrl} onfile={handleFile} />
		<ButtonRow scanDisabled={imageBase64 === null} onscan={handleScan} onclear={handleClear} />
	</div>

	<div class="result-panel">
		{#if appState === 'empty'}
			<div class="state-empty">
				<div class="big-num">01</div>
				<p>
					Upload a photo of any book cover. BookLens will identify the title, author, and pull
					metadata from Google Books.
				</p>
			</div>
		{/if}

		<LoadingSteps active={appState === 'loading'} />

		{#if appState === 'result' && result}
			<ResultCard {result} userImageUrl={previewUrl} onscanother={handleClear} />
		{/if}

		{#if appState === 'error'}
			<ErrorBanner message={errorMessage} />
		{/if}
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 5rem 2rem 3rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem;
		align-items: start;
	}

	.upload-panel {
		position: sticky;
		top: 2rem;
	}

	.result-panel {
		min-height: 300px;
	}

	.state-empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem 0;
		color: var(--muted);
	}

	.state-empty .big-num {
		font-family: 'Playfair Display', serif;
		font-size: 4rem;
		color: rgba(26, 22, 18, 0.07);
		line-height: 1;
	}

	.state-empty p {
		font-size: 0.9rem;
		line-height: 1.6;
		max-width: 280px;
	}

	@media (max-width: 680px) {
		main {
			grid-template-columns: 1fr;
			padding: 5.5rem 1.25rem 2rem;
			gap: 1rem;
		}

		.upload-panel {
			position: static;
			width: 100%;
		}

		.state-empty {
			display: none;
		}

		main.has-result .upload-panel {
			display: none;
		}
	}
</style>
