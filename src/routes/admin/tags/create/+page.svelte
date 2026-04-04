<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';

	let dirty = $state(false);

	function markDirty() {
		dirty = true;
	}

	function cancel() {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
		goto('/admin/tags');
	}
</script>

<svelte:head>
	<title>New tag — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a href="/admin/tags" class="text-sm text-secondary hover:text-primary">&larr; Back</a>
		<h1 class="text-xl font-bold text-primary">New tag</h1>
	</div>

	<form id="create-tag" method="POST" action="?/create" use:enhance oninput={markDirty} class="mt-6 flex flex-col gap-3">
		<FormField label="Label" name="label" required />
		<FormField label="Slug" name="slug" help="Auto-generated from label if empty" />
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="create-tag">Create</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
	</div>
</section>
