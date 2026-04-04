<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/admin/Button.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Categories — Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Categories</h1>

	<!-- Category table -->
	{#if data.categories.length > 0}
		<table class="mt-6 w-full text-sm">
			<thead>
				<tr class="border-b border-subtle text-left text-xs text-secondary">
					<th class="pb-2 font-medium">Name</th>
					<th class="pb-2 font-medium">Slug</th>
					<th class="pb-2 font-medium">Items</th>
					<th class="pb-2 font-medium">Order</th>
					<th class="pb-2 text-right font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.categories as cat, i (cat.id)}
					<tr class="border-b border-subtle/50">
						<td class="py-2 text-primary">
							<a href="/admin/categories/{cat.id}" class="text-accent hover:underline">
								{cat.name}
							</a>
						</td>
						<td class="py-2 text-secondary">{cat.slug}</td>
						<td class="py-2 text-secondary">{cat.itemCount}</td>
						<td class="py-2 text-secondary">{cat.order}</td>
						<td class="flex items-center justify-end gap-1 py-2">
							<form method="POST" action="?/reorder" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="direction" value="up" />
								<Button variant="table" type="submit" disabled={i === 0}>up</Button>
							</form>
							<form method="POST" action="?/reorder" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="direction" value="down" />
								<Button variant="table" type="submit" disabled={i === data.categories.length - 1}>down</Button>
							</form>
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Delete "${cat.name}"? This also removes all its items.`)) {
										e.preventDefault();
									}
								}}
							>
								<input type="hidden" name="id" value={cat.id} />
								<Button variant="table-danger" type="submit">delete</Button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="mt-6 text-sm text-secondary">No categories yet.</p>
	{/if}

	<div class="mt-8">
		<a
			href="/admin/categories/create"
			class="inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
		>
			New category
		</a>
	</div>
</section>
