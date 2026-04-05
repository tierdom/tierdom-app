<script lang="ts">
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
	import TagPicker from '$lib/components/admin/TagPicker.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import type { PageData } from './$types';

	const loader = createAdminLoader();
	const { enhance } = loader;

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);
	let selectedTags = $state<string[]>([]);

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto(`/admin/categories/${data.category.id}`);
	}

	function handleTagsChange(slugs: string[]) {
		selectedTags = slugs;
		markDirty();
	}

	async function handleCreateTag(label: string) {
		const body = new FormData();
		body.set('label', label);
		const response = await fetch('?/createTag', { method: 'POST', body });
		const result = deserialize(await response.text());
		if (result.type === 'success' && result.data) {
			return result.data.tag as { slug: string; label: string };
		}
		throw new Error('Failed to create tag');
	}
</script>

<svelte:head>
	<title>New item — {data.category.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<div class="flex items-center gap-3">
		<a
			href="/admin/categories/{data.category.id}"
			class="text-sm text-secondary hover:text-primary"
		>
			&larr; Back to {data.category.name}
		</a>
		<h1 class="text-xl font-bold text-primary">New item</h1>
	</div>

	<form
		id="create-item"
		method="POST"
		action="?/create"
		use:enhance
		oninput={markDirty}
		class="mt-6 flex flex-col gap-3"
	>
		<FormField label="Name" name="name" required />
		<FormField label="Slug" name="slug" help="Auto-generated from name if empty" />
		<FormField label="Score" name="score" type="number" required min={0} max={100} step={1} />
		<TagPicker
			allTags={data.allTags}
			selectedSlugs={selectedTags}
			onchange={handleTagsChange}
			oncreate={handleCreateTag}
		/>
		<MarkdownField label="Description" name="description" />
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="create-item">Create</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
	</div>
</section>
