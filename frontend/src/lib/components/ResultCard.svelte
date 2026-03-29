<script lang="ts">
	import type { BookResult } from '$lib/types';

	interface Props {
		result: BookResult;
		userImageUrl: string | null;
		onscanother: () => void;
	}

	let { result, userImageUrl, onscanother }: Props = $props();

	let isAiOnly = $derived(result.source === 'ai_vision');
	let authorDisplay = $derived(result.author ? `by ${result.author}` : '');
	let yearDisplay = $derived(result.publishedDate ? result.publishedDate.slice(0, 4) : '—');
	let pagesDisplay = $derived(result.pageCount ? `${result.pageCount} pp.` : '—');
	let descriptionDisplay = $derived(
		result.description
			? result.description.slice(0, 280) + (result.description.length > 280 ? '…' : '')
			: 'No description available.'
	);
</script>

<div class="result-card">
	<div class="result-header">
		<span class="result-label">Book identified</span>
		{#if isAiOnly}
			<span class="confidence-badge ai-only">AI ONLY</span>
		{:else}
			<span class="confidence-badge">HIGH MATCH</span>
		{/if}
	</div>
	<div class="result-body">
		<!-- Mobile: cover + title row (hidden on desktop via +page.svelte responsive) -->
		<div class="result-cover-row">
			<img src={result.thumbnail ?? userImageUrl ?? ''} alt="Book cover" />
			<div class="result-cover-info">
				<div class="book-title">{result.title}</div>
				<div class="book-author">{authorDisplay}</div>
			</div>
		</div>

		<!-- Desktop: title + author -->
		<div class="book-title desktop-only">{result.title}</div>
		<div class="book-author desktop-only">{authorDisplay}</div>

		<!-- Cover comparison -->
		{#if result.thumbnail && userImageUrl}
			<div class="cover-compare">
				<div class="cover-compare-item">
					<img src={userImageUrl} alt="Your photo" />
					<div class="cover-compare-label">Your photo</div>
				</div>
				<div class="cover-compare-item">
					<img src={result.thumbnail} alt="Google Books cover" />
					<div class="cover-compare-label">Google Books</div>
				</div>
			</div>
		{/if}

		<hr class="divider-line" />

		{#if isAiOnly}
			<div class="ai-only-notice">
				<p>Title and author detected by AI vision. No matching book was found on Google Books, so additional metadata is unavailable.</p>
			</div>
		{:else}
			<div class="meta-grid">
				<div class="meta-item">
					<label>Publisher</label>
					<div class="val">{result.publisher ?? '—'}</div>
				</div>
				<div class="meta-item">
					<label>Published</label>
					<div class="val">{yearDisplay}</div>
				</div>
				<div class="meta-item">
					<label>Pages</label>
					<div class="val">{pagesDisplay}</div>
				</div>
				<div class="meta-item">
					<label>Category</label>
					<div class="val">{result.categories ?? '—'}</div>
				</div>
			</div>

			<div class="description-section">
				<label>Description</label>
				<div class="description-text">{descriptionDisplay}</div>
			</div>

			{#if result.infoLink}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={result.infoLink} target="_blank" rel="noopener noreferrer" class="google-books-link">
					View on Google Books
					<svg viewBox="0 0 24 24"
						><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline
							points="15 3 21 3 21 9"
						/><line x1="10" y1="14" x2="21" y2="3" /></svg
					>
				</a>
			{/if}
		{/if}

		<button class="btn-scan-another" onclick={onscanother}>Scan another book</button>
	</div>
</div>

<style>
	.result-card {
		background: var(--paper);
		border: 1px solid var(--border);
		border-radius: 4px;
		overflow: hidden;
		animation: slideUp 0.4s ease forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.result-header {
		background: var(--ink);
		color: var(--cream);
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.result-label {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(245, 240, 232, 0.5);
		font-family: 'DM Mono', monospace;
	}

	.confidence-badge {
		font-size: 0.7rem;
		font-family: 'DM Mono', monospace;
		padding: 0.2rem 0.6rem;
		border-radius: 2px;
		background: rgba(201, 168, 76, 0.2);
		color: var(--gold);
		letter-spacing: 0.05em;
	}

	.confidence-badge.ai-only {
		background: rgba(180, 180, 180, 0.2);
		color: rgba(245, 240, 232, 0.6);
	}

	.result-body {
		padding: 1.5rem 1.25rem;
	}

	.result-cover-row {
		display: none;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.result-cover-row .result-cover-info {
		flex: 1;
		min-width: 0;
	}

	.result-cover-row img {
		width: 70px;
		height: 95px;
		object-fit: cover;
		border-radius: 3px;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}

	.book-title {
		font-family: 'Playfair Display', serif;
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.2;
		margin-bottom: 0.4rem;
		color: var(--ink);
	}

	.book-author {
		font-size: 0.95rem;
		color: var(--rust);
		margin-bottom: 1.25rem;
		font-weight: 400;
	}

	.cover-compare {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.cover-compare-item {
		flex: 1;
		text-align: center;
	}

	.cover-compare-item img {
		width: 100%;
		max-height: 200px;
		object-fit: contain;
		border-radius: 3px;
		border: 1px solid var(--border);
	}

	.cover-compare-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		margin-top: 0.4rem;
	}

	.divider-line {
		border: none;
		border-top: 1px solid var(--border);
		margin: 1.25rem 0;
	}

	.ai-only-notice {
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--muted);
		font-style: italic;
	}

	.ai-only-notice p {
		margin: 0;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.meta-item label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		display: block;
		margin-bottom: 0.25rem;
	}

	.meta-item .val {
		font-size: 0.9rem;
		color: var(--ink);
		font-weight: 400;
	}

	.description-section {
		margin-top: 1.25rem;
	}

	.description-section label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-family: 'DM Mono', monospace;
		display: block;
		margin-bottom: 0.5rem;
	}

	.description-text {
		font-size: 0.875rem;
		line-height: 1.65;
		color: var(--ink);
		opacity: 0.8;
	}

	.google-books-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1.25rem;
		font-size: 0.8rem;
		color: var(--rust);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.15s;
	}

	.google-books-link:hover {
		color: #b5562a;
	}

	.google-books-link svg {
		width: 14px;
		height: 14px;
		stroke: currentColor;
		fill: none;
		stroke-width: 2;
	}

	.btn-scan-another {
		display: none;
		width: 100%;
		padding: 0.65rem 1rem;
		margin-top: 1rem;
		border-radius: 3px;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--ink);
		transition: all 0.15s;
	}

	.btn-scan-another:hover {
		background: var(--paper);
	}

	@media (max-width: 680px) {
		.result-cover-row {
			display: flex;
		}

		.desktop-only {
			display: none;
		}

		.btn-scan-another {
			display: block;
		}
	}
</style>
