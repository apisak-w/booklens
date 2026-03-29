<script lang="ts">
	interface Props {
		scanDisabled: boolean;
		onscan: () => void;
		onclear: () => void;
	}

	let { scanDisabled, onscan, onclear }: Props = $props();
</script>

<div class="btn-row">
	<button class="btn btn-primary" disabled={scanDisabled} onclick={onscan}>Identify Book</button>
	<button class="btn btn-secondary" onclick={onclear}>Clear</button>
</div>

<style>
	.btn-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}
</style>
