<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Plus, Save, X, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
	import TagPicker from '$lib/components/admin/TagPicker.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import { createTag } from '$lib/components/admin/create-tag';

	type Category = { id: number; name: string };

	let {
		mode,
		categories,
		allTags,
		initialValues = {},
		initialTags = [],
		returnTarget,
		backUrl
	}: {
		mode: 'create' | 'edit';
		categories: Category[];
		allTags: { slug: string; label: string }[];
		initialValues?: {
			name?: string;
			slug?: string;
			score?: number;
			description?: string | null;
			categoryId?: number | null;
			imageHash?: string | null;
		};
		initialTags?: string[];
		returnTarget: 'categories' | 'items';
		backUrl: string;
	} = $props();

	const loader = createAdminLoader();
	const { enhance } = loader;

	let dirty = $state(false);
	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally — intentional: mutable copy of initial prop
	let selectedTags = $state<string[]>(initialTags.slice());

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto(resolve(backUrl as '/'));
	}

	function handleTagsChange(slugs: string[]) {
		selectedTags = slugs;
		markDirty();
	}
</script>

<AdminOverlay loading={loader.loading} />

<form
	id="item-form"
	method="POST"
	action="?/save"
	enctype="multipart/form-data"
	use:enhance
	oninput={markDirty}
	class="mt-6 flex flex-col gap-3"
>
	<input type="hidden" name="_returnTarget" value={returnTarget} />

	<div class="flex flex-col gap-1">
		<label for="categoryId" class="text-xs font-medium text-secondary">
			Category<span class="text-red-400"> *</span>
		</label>
		<select
			id="categoryId"
			name="categoryId"
			required
			class="rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
		>
			{#if mode === 'create'}
				<option value="">Select a category…</option>
			{/if}
			{#each categories as cat (cat.id)}
				<option value={cat.id} selected={cat.id === initialValues.categoryId}>{cat.name}</option>
			{/each}
		</select>
	</div>

	<FormField label="Name" name="name" value={initialValues.name} required />
	<FormField
		label="Slug"
		name="slug"
		value={initialValues.slug}
		help="Auto-generated from name if empty"
	/>
	<FormField
		label="Score"
		name="score"
		type="number"
		value={initialValues.score}
		required
		min={0}
		max={100}
		step={1}
	/>
	<ImageField imageHash={initialValues.imageHash} onchange={markDirty} />

	<TagPicker
		{allTags}
		selectedSlugs={selectedTags}
		onchange={handleTagsChange}
		oncreate={createTag}
	/>
	<MarkdownField label="Description" name="description" value={initialValues.description} />
</form>

<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
	{#if mode === 'create'}
		<Button type="submit" form="item-form"><Plus size={16} />Create</Button>
	{:else}
		<Button type="submit" form="item-form"><Save size={16} />Save</Button>
	{/if}
	<Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
	{#if mode === 'edit'}
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this item?')) e.preventDefault();
			}}
		>
			<input type="hidden" name="_returnTarget" value={returnTarget} />
			<Button variant="danger" type="submit"><Trash2 size={16} />Delete</Button>
		</form>
	{/if}
</div>
