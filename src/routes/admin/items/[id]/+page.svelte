<script lang="ts">
	import { enhance } from '$app/forms';
	import FormField from '$lib/components/admin/FormField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.item.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a
			href="/admin/categories/{data.item.categoryId}"
			class="text-sm text-secondary hover:text-primary"
		>
			&larr; Back to category
		</a>
		<h1 class="text-xl font-bold text-primary">{data.item.name}</h1>
	</div>

	<form method="POST" action="?/update" use:enhance class="mt-6 flex flex-col gap-3">
		<FormField label="Name" name="name" value={data.item.name} required />
		<FormField label="Slug" name="slug" value={data.item.slug} />
		<FormField
			label="Score"
			name="score"
			type="number"
			value={data.item.score}
			required
			min={0}
			max={100}
			step={1}
		/>
		<FormField label="Order" name="order" type="number" value={data.item.order} />
		<FormField
			label="Description"
			name="description"
			value={data.item.description}
			multiline
		/>

		<div>
			<button
				type="submit"
				class="cursor-pointer rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
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
			if (!confirm('Delete this item?')) e.preventDefault();
		}}
		class="mt-2"
	>
		<button
			type="submit"
			class="cursor-pointer rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
		>
			Delete item
		</button>
	</form>
</section>
