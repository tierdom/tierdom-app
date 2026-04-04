<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Dashboard</h1>

	<div class="mt-6 grid grid-cols-3 gap-4">
		<div class="rounded-lg border border-subtle bg-elevated p-4">
			<p class="text-2xl font-bold text-primary">{data.counts.categories}</p>
			<p class="text-xs text-secondary">Categories</p>
		</div>
		<div class="rounded-lg border border-subtle bg-elevated p-4">
			<p class="text-2xl font-bold text-primary">{data.counts.items}</p>
			<p class="text-xs text-secondary">Items</p>
		</div>
		<div class="rounded-lg border border-subtle bg-elevated p-4">
			<p class="text-2xl font-bold text-primary">{data.counts.tags}</p>
			<p class="text-xs text-secondary">Tags</p>
		</div>
	</div>

	<p class="mt-8 text-xs text-secondary">
		To seed the database with demo data, run <code class="text-primary">npm run db:seed</code>
	</p>
</section>
