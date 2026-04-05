<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/admin/Button.svelte';
	import SortableList from '$lib/components/admin/SortableList.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const loader = createAdminLoader();
	const { enhance } = loader;

	const handleReorder = loader.withLoading(async (orderedIds: number[]) => {
		const body = new FormData();
		body.set('order', JSON.stringify(orderedIds));
		await fetch('?/reorder', { method: 'POST', body });
	});
</script>

<svelte:head>
	<title>Categories — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<h1 class="text-xl font-bold text-primary">Categories</h1>

	{#if data.categories.length > 0}
		<div class="mt-6 w-full text-sm">
			<div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
				<div class="w-8"></div>
				<div class="flex-1 font-medium">Name</div>
				<div class="flex-1 font-medium">Slug</div>
				<div class="w-16 font-medium">Items</div>
				<div class="w-24 text-right font-medium">Actions</div>
			</div>

			<SortableList items={data.categories} onreorder={handleReorder}>
				{#snippet row(cat)}
					<div class="flex flex-1 items-center py-2">
						<div class="flex-1 text-primary">
							<a href="/admin/categories/{cat.id}" class="text-accent hover:underline">
								{cat.name}
							</a>
						</div>
						<div class="flex-1 text-secondary">{cat.slug}</div>
						<div class="w-16 text-secondary">{cat.itemCount}</div>
						<div class="w-24 text-right">
							<form
								method="POST"
								action="?/delete"
								use:enhance
								class="inline"
								onsubmit={(e) => {
									if (!confirm(`Delete "${cat.name}"? This also removes all its items.`)) {
										e.preventDefault();
									}
								}}
							>
								<input type="hidden" name="id" value={cat.id} />
								<Button variant="table-danger" type="submit"><Trash2 size={12} />delete</Button>
							</form>
						</div>
					</div>
				{/snippet}
			</SortableList>
		</div>
	{:else}
		<p class="mt-6 text-sm text-secondary">No categories yet.</p>
	{/if}

	<div class="mt-8">
		<a
			href="/admin/categories/create"
			class="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
		>
			<Plus size={16} />New category
		</a>
	</div>
</section>
