<script lang="ts">
	import Button from '$lib/components/admin/Button.svelte';
	import TierBadge from '$lib/components/admin/TierBadge.svelte';
	import TagPill from '$lib/components/admin/TagPill.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import { scoreToTier } from '$lib/tier';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const loader = createAdminLoader();
	const { enhance } = loader;

	let search = $state('');

	let filtered = $derived(() => {
		if (!search.trim()) return data.items;
		const q = search.toLowerCase();
		return data.items.filter(
			(item) =>
				item.name.toLowerCase().includes(q) ||
				item.slug.toLowerCase().includes(q) ||
				item.categoryName.toLowerCase().includes(q)
		);
	});
</script>

<svelte:head>
	<title>Items (all) — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />

	<h1 class="text-xl font-bold text-primary">Items ({data.items.length})</h1>

	<input
		type="text"
		placeholder="Quick search by name, slug, or category…"
		bind:value={search}
		class="mt-4 w-full rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
	/>

	{#if filtered().length > 0}
		<div class="mt-4 w-full text-sm">
			<div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
				<div class="w-8 font-medium">Tier</div>
				<div class="flex-1 font-medium">Name</div>
				<div class="hidden w-40 font-medium sm:block">Category</div>
				<div class="w-14 font-medium">Score</div>
				<div class="w-20 text-right font-medium">Actions</div>
			</div>

			{#each filtered() as item (item.id)}
				{@const tier = scoreToTier(item.score, {
					S: item.cutoffS,
					A: item.cutoffA,
					B: item.cutoffB,
					C: item.cutoffC,
					D: item.cutoffD,
					E: item.cutoffE,
					F: item.cutoffF
				})}
				<div class="flex items-center border-b border-subtle/30 py-2">
					<div class="w-8 flex-shrink-0">
						<TierBadge {tier} />
					</div>
					<div class="min-w-0 flex-1 text-primary">
						<div class="flex items-center gap-1.5">
							<a
								href="/admin/items/{item.id}?from=/admin/items"
								class="shrink-0 text-accent hover:underline"
							>
								{item.name}
							</a>
							{#if item.tags.length > 0}
								<div class="hidden gap-1 lg:flex">
									{#each item.tags as t (t.slug)}
										<TagPill label={t.label} />
									{/each}
								</div>
							{/if}
						</div>
					</div>
					<div class="hidden w-40 truncate text-xs text-secondary sm:block">
						{item.categoryName}
					</div>
					<div class="w-14 text-secondary">{item.score}</div>
					<div class="w-20 text-right">
						<form
							method="POST"
							action="?/delete"
							use:enhance
							class="inline"
							onsubmit={(e) => {
								if (!confirm(`Delete "${item.name}"?`)) e.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={item.id} />
							<Button variant="table-danger" type="submit">delete</Button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{:else if search.trim()}
		<p class="mt-6 text-sm text-secondary">No items matching "{search}".</p>
	{:else}
		<p class="mt-6 text-sm text-secondary">No items yet.</p>
	{/if}
</section>
