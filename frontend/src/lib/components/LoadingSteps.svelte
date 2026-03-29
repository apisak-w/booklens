<script lang="ts">
	interface Props {
		active: boolean;
	}

	let { active }: Props = $props();

	const steps = [
		'Analysing cover image…',
		'Extracting title & author…',
		'Fetching from Google Books…',
		'Compiling result…'
	];

	const delays = [0, 800, 1800, 2800];

	let currentStep = $state(-1);
	let barKey = $state(0);
	let timeouts: ReturnType<typeof setTimeout>[] = [];

	$effect(() => {
		// Clear previous timeouts
		timeouts.forEach(clearTimeout);
		timeouts = [];

		if (active) {
			currentStep = -1;
			barKey++;
			delays.forEach((delay, i) => {
				const t = setTimeout(() => {
					currentStep = i;
				}, delay);
				timeouts.push(t);
			});
		} else {
			currentStep = -1;
		}
	});
</script>

{#if active}
	<div class="state-loading">
		<div class="loading-bar">
			{#key barKey}
				<div class="loading-bar-inner"></div>
			{/key}
		</div>
		<div class="loading-steps">
			{#each steps as step, i}
				<div class="step" class:active={currentStep === i} class:done={currentStep > i}>
					<div class="step-dot"></div>
					{step}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.state-loading {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem 0;
	}

	.loading-bar {
		height: 3px;
		background: var(--paper);
		border-radius: 99px;
		overflow: hidden;
	}

	.loading-bar-inner {
		height: 100%;
		background: linear-gradient(90deg, var(--rust), var(--gold));
		width: 0%;
		animation: barfill 3s ease-in-out forwards;
		border-radius: 99px;
	}

	@keyframes barfill {
		0% {
			width: 0%;
		}
		40% {
			width: 55%;
		}
		70% {
			width: 78%;
		}
		90% {
			width: 90%;
		}
		100% {
			width: 95%;
		}
	}

	.loading-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: var(--muted);
		opacity: 0;
		transform: translateY(4px);
		transition:
			opacity 0.3s,
			transform 0.3s;
	}

	.step.active {
		opacity: 1;
		transform: translateY(0);
		color: var(--ink);
	}

	.step.done {
		opacity: 0.45;
		transform: translateY(0);
	}

	.step-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--border);
		flex-shrink: 0;
		transition: background 0.3s;
	}

	.step.active .step-dot {
		background: var(--rust);
	}

	.step.done .step-dot {
		background: var(--sage);
	}
</style>
