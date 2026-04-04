<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>tierdom</title>
	<link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

<!-- ─── Fixed top navigation ──────────────────────────────────────────────── -->
<header class="fixed inset-x-0 top-0 z-50 border-b border-subtle bg-elevated/80 backdrop-blur-sm">
	<nav class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
		<!-- Site name / logo -->
		<a
			href={resolve('/')}
			class="shrink-0 text-sm font-bold tracking-widest text-accent uppercase transition-opacity hover:opacity-80"
		>
			tierdom
		</a>

		<!-- Nav items — scrollable on very small screens -->
		<ul class="flex flex-1 items-center gap-1 overflow-x-auto">
			{#each data.categories as cat (cat.id)}
				<li class="shrink-0">
					<a
						href={`/category/${cat.slug}`}
						class="rounded px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-surface hover:text-primary"
					>
						{cat.name}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</header>

<!-- ─── Main content — offset for fixed nav height ────────────────────────── -->
<main class="mx-auto min-h-screen max-w-6xl px-4 pt-14">
	{@render children()}
</main>

<!-- ─── Footer ────────────────────────────────────────────────────────────── -->
<footer class="mt-16 border-t border-subtle py-8">
	<div class="mx-auto max-w-6xl px-4 text-center">
		<p class="text-sm text-secondary">tierdom-pro — my personal tier lists</p>
		<p class="mt-1 text-xs text-secondary/50">placeholder footer · replace me</p>
	</div>
</footer>
