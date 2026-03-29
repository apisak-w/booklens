<header>
	<div class="logo">Book<span>Lens</span></div>
	<div class="tagline">Cover recognition</div>
</header>

<style>
	header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: 1.25rem 3rem;
		display: flex;
		align-items: baseline;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--cream);
	}

	.logo {
		font-family: 'Playfair Display', serif;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--ink);
	}

	.logo span {
		color: var(--rust);
	}

	.tagline {
		font-size: 0.8rem;
		color: var(--muted);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 400;
	}

	@media (max-width: 680px) {
		header {
			padding: 1rem 1.25rem;
		}
	}
</style>
