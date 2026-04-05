<script lang="ts">
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Save, X, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
	import TagPicker from '$lib/components/admin/TagPicker.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import Timestamps from '$lib/components/admin/Timestamps.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import type { PageData } from './$types';

	const loader = createAdminLoader();
	const { enhance } = loader;

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);
	// Mutable local copy of the item's tags — intentionally capturing initial value
	let selectedTags: string[] = $state(data.itemTags.slice());

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto(data.backUrl);
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
	<title>{data.item.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<div class="flex items-center gap-3">
		<a href={data.backUrl} class="text-sm text-secondary hover:text-primary"> &larr; Back </a>
		<h1 class="text-xl font-bold text-primary">{data.item.name}</h1>
		<Timestamps createdAt={data.item.createdAt} updatedAt={data.item.updatedAt} />
	</div>

	<form
		id="edit-item"
		method="POST"
		action="?/update"
		use:enhance
		oninput={markDirty}
		class="mt-6 flex flex-col gap-3"
	>
		<input type="hidden" name="_from" value={data.backUrl} />
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
		<TagPicker
			allTags={data.allTags}
			selectedSlugs={selectedTags}
			onchange={handleTagsChange}
			oncreate={handleCreateTag}
		/>
		<MarkdownField label="Description" name="description" value={data.item.description} />
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="edit-item"><Save size={16} />Save</Button>
		<Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this item?')) e.preventDefault();
			}}
		>
			<input type="hidden" name="_from" value={data.backUrl} />
			<Button variant="danger" type="submit"><Trash2 size={16} />Delete</Button>
		</form>
	</div>
</section>
