<script lang="ts">
	import type { PageData } from './$types';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import TierListItem from '$lib/components/TierListItem.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import ItemDetail from '$lib/components/ItemDetail.svelte';

	let { data }: { data: PageData } = $props();

	const tierStyles: Record<string, string> = {
		S: 'bg-[var(--tier-s-bg)] text-[var(--tier-s-fg)]',
		A: 'bg-[var(--tier-a-bg)] text-[var(--tier-a-fg)]',
		B: 'bg-[var(--tier-b-bg)] text-[var(--tier-b-fg)]',
		C: 'bg-[var(--tier-c-bg)] text-[var(--tier-c-fg)]',
		D: 'bg-[var(--tier-d-bg)] text-[var(--tier-d-fg)]',
		E: 'bg-[var(--tier-e-bg)] text-[var(--tier-e-fg)]',
		F: 'bg-[var(--tier-f-bg)] text-[var(--tier-f-fg)]'
	};

	let allItems = $derived(
		data.tiers.flatMap((t) => t.items.map((item) => ({ ...item, tier: t.tier })))
	);

	let selectedItem = $derived(
		page.state.showItem
			? (allItems.find((i) => i.slug === page.state.showItem) ?? null)
			: null
	);

	function openItem(slug: string) {
		pushState('', { showItem: slug });
	}

	function closeItem() {
		pushState('', {});
	}
</script>

<svelte:head>
	<title>{selectedItem ? `${selectedItem.name} — ` : ''}{data.category.name} — tierdom</title>
</svelte:head>

<section class="py-10">
	<!-- Category header -->
	<h1 class="text-2xl font-bold text-primary">{data.category.name}</h1>
	{#if data.category.description}
		<p class="mt-2 max-w-2xl text-sm text-secondary">{data.category.description}</p>
	{/if}

	<!-- Tier rows -->
	<div class="mt-8 flex flex-col gap-1">
		{#each data.tiers as { tier, items } (tier)}
			<div class="flex overflow-hidden border-2 border-subtle">
				<!-- Tier label -->
				<div
					class="flex w-14 shrink-0 items-start justify-center pt-3 text-xl font-black {tierStyles[tier]}"
				>
					{tier}
				</div>

				<!-- Items -->
				<div class="flex flex-1 flex-wrap bg-surface">
					{#each items as item (item.id)}
						<TierListItem
							name={item.name}
							score={item.score}
							onclick={() => openItem(item.slug)}
						/>
					{/each}
				</div>
			</div>
		{/each}

		{#if data.tiers.length === 0}
			<p class="text-secondary">No items in this category yet.</p>
		{/if}
	</div>
</section>

{#if selectedItem}
	<Dialog open onclose={closeItem}>
		<ItemDetail
			name={selectedItem.name}
			score={selectedItem.score}
			description={selectedItem.description}
			tier={selectedItem.tier}
			tags={selectedItem.tags}
		/>
	</Dialog>
{/if}
