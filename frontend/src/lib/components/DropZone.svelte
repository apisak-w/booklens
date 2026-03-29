<script lang="ts">
	interface Props {
		previewUrl: string | null;
		onfile: (base64: string, previewUrl: string) => void;
	}

	let { previewUrl, onfile }: Props = $props();

	let dropZoneEl: HTMLDivElement;
	let fileInputEl: HTMLInputElement;
	let dragover = $state(false);

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragover = false;
		const file = e.dataTransfer?.files[0];
		if (file && file.type.startsWith('image/')) loadFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragover = true;
	}

	function handleFileChange() {
		const file = fileInputEl?.files?.[0];
		if (file) loadFile(file);
	}

	function loadFile(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			const base64 = dataUrl.split(',')[1];
			onfile(base64, dataUrl);
		};
		reader.readAsDataURL(file);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="drop-zone"
	class:dragover
	class:has-preview={previewUrl !== null}
	bind:this={dropZoneEl}
	onclick={() => fileInputEl.click()}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={() => (dragover = false)}
>
	{#if previewUrl}
		<img class="preview" src={previewUrl} alt="Book cover preview" />
	{/if}
	{#if !previewUrl}
		<div class="drop-icon">
			<svg viewBox="0 0 24 24"
				><path d="M4 16l4-4 4 4 4-6 4 6" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg
			>
		</div>
		<div class="drop-text">
			<strong>Drop a book cover here</strong><br />
			or click to browse
		</div>
	{/if}
</div>
<input
	type="file"
	accept="image/*"
	bind:this={fileInputEl}
	onchange={handleFileChange}
	style="display:none"
/>

<style>
	.drop-zone {
		border: 1.5px dashed var(--border);
		border-radius: 4px;
		background: var(--paper);
		aspect-ratio: 3/4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		cursor: pointer;
		transition:
			border-color 0.2s,
			background 0.2s;
		overflow: hidden;
		position: relative;
	}

	.drop-zone:hover {
		border-color: var(--rust);
		background: #eae5d9;
	}

	.drop-zone.dragover {
		border-color: var(--rust);
		background: #f0ebe0;
		border-style: solid;
	}

	.preview {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.drop-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(196, 98, 45, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.drop-zone:hover .drop-icon {
		background: rgba(196, 98, 45, 0.18);
	}

	.drop-icon svg {
		width: 22px;
		height: 22px;
		stroke: var(--rust);
		fill: none;
		stroke-width: 1.5;
	}

	.drop-text {
		text-align: center;
		font-size: 0.875rem;
		color: var(--muted);
		line-height: 1.5;
	}

	.drop-text strong {
		color: var(--rust);
		font-weight: 500;
	}

	@media (max-width: 680px) {
		.drop-zone {
			aspect-ratio: auto;
			max-height: 40vh;
			min-height: 200px;
			width: 100%;
		}

		.preview {
			position: relative;
			inset: auto;
			max-height: 40vh;
			object-fit: contain;
		}
	}
</style>
