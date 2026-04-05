<script lang="ts">
	import Timestamps from '$lib/components/admin/Timestamps.svelte';
	import ItemForm from '$lib/components/admin/ItemForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	{#if data.mode === 'create'}
		<title>New item — Admin — tierdom</title>
	{:else}
		<title>{data.item.name} — Admin — tierdom</title>
	{/if}
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a href={data.backUrl} class="text-sm text-secondary hover:text-primary"> &larr; Back </a>
		{#if data.mode === 'create'}
			<h1 class="text-xl font-bold text-primary">New item</h1>
		{:else}
			<h1 class="text-xl font-bold text-primary">{data.item.name}</h1>
			<Timestamps createdAt={data.item.createdAt} updatedAt={data.item.updatedAt} />
		{/if}
	</div>

	{#if data.mode === 'create'}
		<ItemForm
			mode="create"
			categories={data.categories}
			allTags={data.allTags}
			initialValues={{ categoryId: data.prefillCategoryId }}
			returnTarget={data.returnTarget}
			backUrl={data.backUrl}
		/>
	{:else}
		<ItemForm
			mode="edit"
			categories={data.categories}
			allTags={data.allTags}
			initialValues={{
				name: data.item.name,
				slug: data.item.slug,
				score: data.item.score,
				description: data.item.description,
				categoryId: data.item.categoryId
			}}
			initialTags={data.itemTags}
			returnTarget={data.returnTarget}
			backUrl={data.backUrl}
		/>
	{/if}
</section>
