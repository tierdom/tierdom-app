<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Items — Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Items</h1>
	<p class="mt-2 text-sm text-secondary">
		{data.itemCount} items across all categories.
	</p>

	<div class="mt-6 rounded-lg border border-subtle bg-elevated px-5 py-8 text-center">
		<p class="text-sm text-secondary">
			Search and quick-edit across all items — coming soon.
		</p>
	</div>
</section>
