<script lang="ts">
	import { enhance } from '$app/forms';
	import FormField from '$lib/components/admin/FormField.svelte';
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
								<button
									type="submit"
									disabled={i === 0}
									class="rounded px-2 py-1 text-xs text-secondary hover:bg-elevated hover:text-primary disabled:opacity-30"
								>
									up
								</button>
							</form>
							<form method="POST" action="?/reorder" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="direction" value="down" />
								<button
									type="submit"
									disabled={i === data.categories.length - 1}
									class="rounded px-2 py-1 text-xs text-secondary hover:bg-elevated hover:text-primary disabled:opacity-30"
								>
									down
								</button>
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
		<p class="mt-6 text-sm text-secondary">No categories yet.</p>
	{/if}

	<!-- Create form -->
	<div class="mt-8 rounded-lg border border-subtle bg-elevated p-4">
		<h2 class="text-sm font-semibold text-secondary">New category</h2>
		<form method="POST" action="?/create" use:enhance class="mt-3 flex flex-col gap-3">
			<div class="grid grid-cols-2 gap-3">
				<FormField label="Name" name="name" required />
				<FormField label="Slug" name="slug" help="Auto-generated from name if empty" />
			</div>
			<FormField label="Description" name="description" multiline />
			<div>
				<button
					type="submit"
					class="rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
				>
					Create
				</button>
			</div>
		</form>
	</div>
</section>
