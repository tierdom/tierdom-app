<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SortableList from '$lib/components/admin/SortableList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto('/admin/categories');
	}

	async function handleReorderItems(orderedIds: number[]) {
		const body = new FormData();
		body.set('order', JSON.stringify(orderedIds));
		await fetch('?/reorderItems', { method: 'POST', body });
	}
</script>

<svelte:head>
	<title>{data.category.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a href="/admin/categories" class="text-sm text-secondary hover:text-primary">&larr; Back</a>
		<h1 class="text-xl font-bold text-primary">{data.category.name}</h1>
	</div>

	<!-- Edit category -->
	<form id="edit-category" method="POST" action="?/update" use:enhance oninput={markDirty} class="mt-6 flex flex-col gap-3">
		<FormField label="Name" name="name" value={data.category.name} required />
		<FormField label="Slug" name="slug" value={data.category.slug} />
		<FormField label="Description" name="description" value={data.category.description} multiline />

		<h2 class="mt-2 text-sm font-semibold text-secondary">Tier cutoffs</h2>
		<p class="text-xs text-secondary/70">Minimum score to reach each tier. Leave empty for defaults (S=90, A=75, B=60, C=45, D=30, E=15, F=0).</p>
		<div class="grid grid-cols-4 gap-3 sm:grid-cols-7">
			<FormField label="S" name="cutoffS" type="number" value={data.category.cutoffS} min={0} max={100} />
			<FormField label="A" name="cutoffA" type="number" value={data.category.cutoffA} min={0} max={100} />
			<FormField label="B" name="cutoffB" type="number" value={data.category.cutoffB} min={0} max={100} />
			<FormField label="C" name="cutoffC" type="number" value={data.category.cutoffC} min={0} max={100} />
			<FormField label="D" name="cutoffD" type="number" value={data.category.cutoffD} min={0} max={100} />
			<FormField label="E" name="cutoffE" type="number" value={data.category.cutoffE} min={0} max={100} />
			<FormField label="F" name="cutoffF" type="number" value={data.category.cutoffF} min={0} max={100} />
		</div>

	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="edit-category">Save</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
		<form
			id="delete-category"
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this category and all its items?')) e.preventDefault();
			}}
		>
			<Button variant="danger" type="submit">Delete</Button>
		</form>
	</div>

	<!-- Items list -->
	<h2 class="mt-10 text-lg font-bold text-primary">Items ({data.items.length})</h2>

	{#if data.items.length > 0}
		<div class="mt-4 w-full text-sm">
			<div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
				<div class="w-8"></div>
				<div class="flex-1 font-medium">Name</div>
				<div class="w-16 font-medium">Score</div>
				<div class="w-24 text-right font-medium">Actions</div>
			</div>

			<SortableList items={data.items} onreorder={handleReorderItems}>
				{#snippet row(item)}
					<div class="flex flex-1 items-center py-2">
						<div class="flex-1 text-primary">
							<a href="/admin/items/{item.id}" class="text-accent hover:underline">
								{item.name}
							</a>
						</div>
						<div class="w-16 text-secondary">{item.score}</div>
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
								<Button variant="table-danger" type="submit">delete</Button>
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
			href="/admin/categories/{data.category.id}/create-item"
			class="inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
		>
			New item
		</a>
	</div>
</section>
