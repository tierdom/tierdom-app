<script lang="ts">
	import { enhance } from '$app/forms';
	import FormField from '$lib/components/admin/FormField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
	<form method="POST" action="?/update" use:enhance class="mt-6 flex flex-col gap-3">
		<FormField label="Name" name="name" value={data.category.name} required />
		<FormField label="Slug" name="slug" value={data.category.slug} />
		<FormField label="Description" name="description" value={data.category.description} multiline />
		<FormField label="Order" name="order" type="number" value={data.category.order} />

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

		<div>
			<button
				type="submit"
				class="rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
			>
				Save
			</button>
		</div>
	</form>

	<form
		method="POST"
		action="?/delete"
		use:enhance
		onsubmit={(e) => {
			if (!confirm('Delete this category and all its items?')) e.preventDefault();
		}}
		class="mt-2"
	>
		<button
			type="submit"
			class="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
		>
			Delete category
		</button>
	</form>

	<!-- Items list -->
	<h2 class="mt-10 text-lg font-bold text-primary">Items ({data.items.length})</h2>

	{#if data.items.length > 0}
		<table class="mt-4 w-full text-sm">
			<thead>
				<tr class="border-b border-subtle text-left text-xs text-secondary">
					<th class="pb-2 font-medium">Name</th>
					<th class="pb-2 font-medium">Score</th>
					<th class="pb-2 font-medium">Order</th>
					<th class="pb-2 text-right font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item (item.id)}
					<tr class="border-b border-subtle/50">
						<td class="py-2 text-primary">
							<a href="/admin/items/{item.id}" class="text-accent hover:underline">
								{item.name}
							</a>
						</td>
						<td class="py-2 text-secondary">{item.score}</td>
						<td class="py-2 text-secondary">{item.order}</td>
						<td class="py-2 text-right">
							<form
								method="POST"
								action="?/deleteItem"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Delete "${item.name}"?`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={item.id} />
								<button
									type="submit"
									class="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-400/10"
								>
									delete
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="mt-4 text-sm text-secondary">No items yet.</p>
	{/if}

	<!-- Add item -->
	<div class="mt-6 rounded-lg border border-subtle bg-elevated p-4">
		<h2 class="text-sm font-semibold text-secondary">Add item</h2>
		<form method="POST" action="?/createItem" use:enhance class="mt-3 flex flex-col gap-3">
			<div class="grid grid-cols-3 gap-3">
				<FormField label="Name" name="name" required />
				<FormField label="Score" name="score" type="number" required min={0} max={100} step={1} />
				<FormField label="Slug" name="slug" help="Auto-generated if empty" />
			</div>
			<FormField label="Description" name="description" multiline />
			<div>
				<button
					type="submit"
					class="rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
				>
					Add item
				</button>
			</div>
		</form>
	</div>
</section>
