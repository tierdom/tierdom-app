<script lang="ts">
	import { formatRelativeDate } from '$lib/format-date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Dashboard</h1>

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		<!-- Pages -->
		<div>
			<a
				href="/admin/pages"
				class="block rounded-lg border border-subtle bg-elevated px-4 py-3 transition-colors hover:border-accent/40"
			>
				<p class="text-2xl font-bold text-primary">{data.counts.pages}</p>
				<p class="text-xs text-secondary">Pages</p>
			</a>
			<ul class="mt-3 flex flex-col gap-1">
				{#each data.pages as pg (pg.slug)}
					<li>
						<a
							href="/admin/pages/{pg.slug}"
							class="flex items-center justify-between rounded border border-subtle bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40"
						>
							<span class="text-primary">{pg.title}</span>
							<span class="text-xs text-secondary">/{pg.slug}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Categories -->
		<div>
			<a
				href="/admin/categories"
				class="block rounded-lg border border-subtle bg-elevated px-4 py-3 transition-colors hover:border-accent/40"
			>
				<p class="text-2xl font-bold text-primary">{data.counts.categories}</p>
				<p class="text-xs text-secondary">Categories</p>
			</a>
			<ul class="mt-3 flex flex-col gap-1">
				{#each data.categories as cat (cat.id)}
					<li>
						<a
							href="/admin/categories/{cat.id}"
							class="flex items-center justify-between rounded border border-subtle bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40"
						>
							<span class="text-primary">{cat.name}</span>
							<span class="text-xs text-secondary">{cat.itemCount} items</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Items -->
		<div>
			<a
				href="/admin/items"
				class="block rounded-lg border border-subtle bg-elevated px-4 py-3 transition-colors hover:border-accent/40"
			>
				<p class="text-2xl font-bold text-primary">{data.counts.items}</p>
				<p class="text-xs text-secondary">Items</p>
			</a>
			<ul class="mt-3 flex flex-col gap-1">
				{#each data.recentItems as item (item.id)}
					<li>
						<a
							href="/admin/items/{item.id}"
							class="flex items-center justify-between rounded border border-subtle bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40"
						>
							<span class="text-primary">{item.name}</span>
							<span class="text-xs text-secondary"
								>{item.categoryName} &middot; {formatRelativeDate(item.updatedAt)}</span
							>
						</a>
					</li>
				{/each}
				{#if data.recentItems.length === 0}
					<li class="px-3 py-2 text-xs text-secondary">No items yet</li>
				{/if}
			</ul>
			<p class="mt-2 px-1 text-xs text-secondary/50">Recently updated</p>
		</div>
	</div>
</section>
