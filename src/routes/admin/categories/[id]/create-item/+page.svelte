<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto(`/admin/categories/${data.category.id}`);
	}
</script>

<svelte:head>
	<title>New item — {data.category.name} — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a
			href="/admin/categories/{data.category.id}"
			class="text-sm text-secondary hover:text-primary"
		>
			&larr; Back to {data.category.name}
		</a>
		<h1 class="text-xl font-bold text-primary">New item</h1>
	</div>

	<form id="create-item" method="POST" action="?/create" use:enhance oninput={markDirty} class="mt-6 flex flex-col gap-3">
		<FormField label="Name" name="name" required />
		<FormField label="Slug" name="slug" help="Auto-generated from name if empty" />
		<FormField
			label="Score"
			name="score"
			type="number"
			required
			min={0}
			max={100}
			step={1}
		/>
		<FormField label="Description" name="description" multiline />
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="create-item">Create</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
	</div>
</section>
