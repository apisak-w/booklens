<script lang="ts">
	interface Props {
		message: string;
	}

	let { message }: Props = $props();
</script>

<div class="state-error">{message}</div>

<style>
	.state-error {
		background: #fef2ee;
		border: 1px solid rgba(196, 98, 45, 0.2);
		border-radius: 4px;
		padding: 1.25rem;
		font-size: 0.875rem;
		color: var(--rust);
		line-height: 1.6;
	}
</style>
