<script lang="ts">
	import { formatRelativeDate } from '$lib/format-date';
	import { goto } from '$app/navigation';
	import { ArrowDown, Save, X, Trash2, Plus } from 'lucide-svelte';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
	import SortableList from '$lib/components/admin/SortableList.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import Timestamps from '$lib/components/admin/Timestamps.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import { scoreToTier } from '$lib/tier';
	import TierBadge from '$lib/components/admin/TierBadge.svelte';
	import TagPill from '$lib/components/admin/TagPill.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const loader = createAdminLoader();
	const { enhance } = loader;

	let dirty = $state(false);
	let userWantsCutoffs = $state(false);
	const hasCutoffs = $derived(
		data.category.cutoffS != null ||
			data.category.cutoffA != null ||
			data.category.cutoffB != null ||
			data.category.cutoffC != null ||
			data.category.cutoffD != null ||
			data.category.cutoffE != null ||
			data.category.cutoffF != null
	);
	const showCutoffs = $derived(userWantsCutoffs || hasCutoffs);

	const cutoffs = $derived({
		S: data.category.cutoffS,
		A: data.category.cutoffA,
		B: data.category.cutoffB,
		C: data.category.cutoffC,
		D: data.category.cutoffD,
		E: data.category.cutoffE,
		F: data.category.cutoffF
	});

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto('/admin/categories');
	}

	const handleReorderItems = loader.withLoading(async (orderedIds: number[]) => {
		const body = new FormData();
		body.set('order', JSON.stringify(orderedIds));
		await fetch('?/reorderItems', { method: 'POST', body });
	});

	const handleSortByScore = loader.withLoading(async () => {
		if (!confirm('Sort all items by score (highest first)? This replaces the current order.'))
			return;
		const sorted = [...data.items].sort((a, b) => b.score - a.score);
		const body = new FormData();
		body.set('order', JSON.stringify(sorted.map((i) => i.id)));
		await fetch('?/reorderItems', { method: 'POST', body });
		location.reload();
	});
</script>

<svelte:head>
	<title>{data.category.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<div class="flex items-center gap-3">
		<a href="/admin/categories" class="text-sm text-secondary hover:text-primary">&larr; Back</a>
		<h1 class="text-xl font-bold text-primary">{data.category.name}</h1>
		<Timestamps createdAt={data.category.createdAt} updatedAt={data.category.updatedAt} />
	</div>

	<!-- Edit category -->
	<form
		id="edit-category"
		method="POST"
		action="?/update"
		use:enhance
		oninput={markDirty}
		class="mt-6 flex flex-col gap-3"
	>
		<FormField label="Name" name="name" value={data.category.name} required />
		<FormField label="Slug" name="slug" value={data.category.slug} />
		<MarkdownField label="Description" name="description" value={data.category.description} />

		{#if showCutoffs}
			<h2 class="mt-2 text-sm font-semibold text-secondary">Tier cutoffs</h2>
			<p class="text-xs text-secondary/70">
				Minimum score to reach each tier. Leave empty for defaults (S=90, A=75, B=60, C=45, D=30,
				E=15, F=0).
			</p>
			<div class="grid grid-cols-4 gap-3 sm:grid-cols-7">
				<FormField
					label="S"
					name="cutoffS"
					type="number"
					value={data.category.cutoffS}
					min={0}
					max={100}
				/>
				<FormField
					label="A"
					name="cutoffA"
					type="number"
					value={data.category.cutoffA}
					min={0}
					max={100}
				/>
				<FormField
					label="B"
					name="cutoffB"
					type="number"
					value={data.category.cutoffB}
					min={0}
					max={100}
				/>
				<FormField
					label="C"
					name="cutoffC"
					type="number"
					value={data.category.cutoffC}
					min={0}
					max={100}
				/>
				<FormField
					label="D"
					name="cutoffD"
					type="number"
					value={data.category.cutoffD}
					min={0}
					max={100}
				/>
				<FormField
					label="E"
					name="cutoffE"
					type="number"
					value={data.category.cutoffE}
					min={0}
					max={100}
				/>
				<FormField
					label="F"
					name="cutoffF"
					type="number"
					value={data.category.cutoffF}
					min={0}
					max={100}
				/>
			</div>
		{:else}
			<button
				type="button"
				class="mt-1 cursor-pointer self-start text-xs text-secondary hover:text-primary"
				onclick={() => (userWantsCutoffs = true)}
			>
				Customize tier cutoffs…
			</button>
		{/if}
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="edit-category"><Save size={16} />Save</Button>
		<Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
		<form
			id="delete-category"
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this category and all its items?')) e.preventDefault();
			}}
		>
			<Button variant="danger" type="submit"><Trash2 size={16} />Delete</Button>
		</form>
	</div>

	<!-- Items list -->
	<div class="mt-10 flex items-center gap-3">
		<h2 class="text-lg font-bold text-primary">Items ({data.items.length})</h2>
		{#if data.items.length > 1}
			<button
				type="button"
				class="cursor-pointer text-xs text-secondary hover:text-primary"
				onclick={handleSortByScore}
			>
				Sort by score
			</button>
		{/if}
	</div>

	{#if data.items.length > 0}
		<div class="mt-4 w-full text-sm">
			<div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
				<div class="flex w-6 shrink-0 items-center justify-center"><ArrowDown size={10} /></div>
				<div class="w-8 font-medium">Tier</div>
				<div class="flex-1 font-medium">Name</div>
				<div class="w-16 font-medium">Score</div>
				<div class="hidden w-24 font-medium md:block">Updated</div>
				<div class="w-24 text-right font-medium">Actions</div>
			</div>

			<SortableList items={data.items} onreorder={handleReorderItems}>
				{#snippet row(item)}
					{@const tier = scoreToTier(item.score as number, cutoffs)}
					<div class="flex flex-1 items-center py-2">
						<div class="w-8 flex-shrink-0">
							<TierBadge {tier} />
						</div>
						<div class="min-w-0 flex-1 text-primary">
							<div class="flex items-center gap-1.5">
								<a href="/admin/items/{item.id}?returnTo=categories" class="shrink-0 text-accent hover:underline">
									{item.name}
								</a>
								{#if item.tags.length > 0}
									<div class="hidden gap-1 lg:flex">
										{#each item.tags as { slug: string; label: string }[] as t (t.slug)}
											<TagPill label={t.label} />
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<div class="w-16 text-secondary">{item.score}</div>
						<div class="hidden w-24 text-xs text-secondary md:block">
							{formatRelativeDate(item.updatedAt)}
						</div>
						<div class="w-24 text-right">
							<form
								method="POST"
								action="?/deleteItem"
								use:enhance
								class="inline"
								onsubmit={(e) => {
									if (!confirm(`Delete "${item.name}"?`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={item.id} />
								<Button variant="table-danger" type="submit"><Trash2 size={12} />delete</Button>
							</form>
						</div>
					</div>
				{/snippet}
			</SortableList>
		</div>
	{:else}
		<p class="mt-4 text-sm text-secondary">No items yet.</p>
	{/if}

	<div class="mt-6">
		<a
			href="/admin/items/new-item?category={data.category.id}&returnTo=categories"
			class="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
		>
			<Plus size={16} />New item
		</a>
	</div>
</section>
