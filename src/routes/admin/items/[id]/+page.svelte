<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import type { PageData } from './$types';

	const loader = createAdminLoader();
	const { enhance } = loader;

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto(`/admin/categories/${data.item.categoryId}`);
	}
</script>

<svelte:head>
	<title>{data.item.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<div class="flex items-center gap-3">
		<a
			href="/admin/categories/{data.item.categoryId}"
			class="text-sm text-secondary hover:text-primary"
		>
			&larr; Back to category
		</a>
		<h1 class="text-xl font-bold text-primary">{data.item.name}</h1>
	</div>

	<form id="edit-item" method="POST" action="?/update" use:enhance oninput={markDirty} class="mt-6 flex flex-col gap-3">
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
		<FormField
			label="Description"
			name="description"
			value={data.item.description}
			multiline
		/>

	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="edit-item">Save</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this item?')) e.preventDefault();
			}}
		>
			<Button variant="danger" type="submit">Delete</Button>
		</form>
	</div>
</section>
