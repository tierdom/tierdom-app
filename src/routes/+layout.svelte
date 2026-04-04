<script lang="ts">
	import './layout.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>tierdom</title>
	<link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

<Navbar categories={data.categories} />

<!-- ─── Main content — offset for fixed nav height ────────────────────────── -->
<main class="mx-auto min-h-screen max-w-6xl px-4 pt-14">
	{@render children()}
</main>

<!-- ─── Footer ────────────────────────────────────────────────────────────── -->
<footer class="mt-16 border-t border-subtle py-8">
	<div class="mx-auto max-w-6xl px-4 text-center">
		<p class="text-sm text-secondary">
			tierdom — personal tier lists by
			<a
				href="https://jeroenheijmans.nl"
				class="text-accent/70 hover:text-accent transition-colors"
				target="_blank"
				rel="noopener noreferrer">Jeroen Heijmans</a
			>
		</p>
		<p class="mt-1 text-xs text-secondary/50">
			<a
				href="https://github.com/jeroenheijmans/tierdom-pro"
				class="hover:text-secondary transition-colors"
				target="_blank"
				rel="noopener noreferrer">Source on GitHub</a
			>
		</p>
	</div>
</footer>
