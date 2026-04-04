<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Dashboard</h1>

	<div class="mt-6 grid grid-cols-2 gap-4">
		<a href="/admin/categories" class="rounded-lg border border-subtle bg-elevated p-5 transition-colors hover:border-accent/40">
			<p class="text-3xl font-bold text-primary">{data.counts.categories}</p>
			<p class="text-sm text-secondary">Categories</p>
			<p class="mt-2 text-xs text-secondary/70">{data.counts.items} items total</p>
		</a>
		<a href="/admin/tags" class="rounded-lg border border-subtle bg-elevated p-5 transition-colors hover:border-accent/40">
			<p class="text-3xl font-bold text-primary">{data.counts.tags}</p>
			<p class="text-sm text-secondary">Tags</p>
		</a>
	</div>

	<p class="mt-8 text-xs text-secondary">
		To seed the database with demo data, run <code class="text-primary">npm run db:seed</code>
	</p>
</section>
