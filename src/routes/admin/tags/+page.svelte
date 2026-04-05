<script lang="ts">
	import { resolve } from '$app/paths';
	import { Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Tags — Admin — tierdom</title>
</svelte:head>

<section>
	<h1 class="text-xl font-bold text-primary">Tags</h1>

	{#if data.tags.length > 0}
		<table class="mt-6 w-full text-sm">
			<thead>
				<tr class="border-b border-subtle text-left text-xs text-secondary">
					<th class="pb-2 font-medium">Label</th>
					<th class="pb-2 font-medium">Slug</th>
					<th class="pb-2 font-medium">Total uses</th>
					<th class="pb-2 font-medium">Categories</th>
				</tr>
			</thead>
			<tbody>
				{#each data.tags as tag (tag.slug)}
					<tr class="border-b border-subtle/50">
						<td class="py-2 text-primary">
							<a href={resolve(`/admin/tags/${tag.slug}`)} class="text-accent hover:underline">
								{tag.label}
							</a>
						</td>
						<td class="py-2 text-secondary">{tag.slug}</td>
						<td class="py-2 text-secondary">{tag.usageCount}</td>
						<td class="py-2">
							{#if tag.categories.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each tag.categories as cat (cat.categoryId)}
										<a
											href={resolve(`/admin/categories/${cat.categoryId}`)}
											class="text-accent hover:underline"
										>
											{cat.categoryName}
											<span class="text-secondary">({cat.itemCount})</span>
										</a>
									{/each}
								</div>
							{:else}
								<span class="text-secondary/50">unused</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="mt-6 text-sm text-secondary">No tags yet.</p>
	{/if}

	<div class="mt-8">
		<a
			href={resolve('/admin/tags/create')}
			class="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
		>
			<Plus size={16} />New tag
		</a>
	</div>
</section>
