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
		goto('/admin/categories');
	}
</script>

<svelte:head>
	<title>New category — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a href="/admin/categories" class="text-sm text-secondary hover:text-primary">&larr; Back</a>
		<h1 class="text-xl font-bold text-primary">New category</h1>
	</div>

	<form id="create-category" method="POST" action="?/create" use:enhance oninput={markDirty} class="mt-6 flex flex-col gap-3">
		<FormField label="Name" name="name" required />
		<FormField label="Slug" name="slug" help="Auto-generated from name if empty" />
		<FormField label="Description" name="description" multiline />
		<FormField label="Order" name="order" type="number" />

		<h2 class="mt-2 text-sm font-semibold text-secondary">Tier cutoffs</h2>
		<p class="text-xs text-secondary/70">Minimum score to reach each tier. Leave empty for defaults (S=90, A=75, B=60, C=45, D=30, E=15, F=0).</p>
		<div class="grid grid-cols-4 gap-3 sm:grid-cols-7">
			<FormField label="S" name="cutoffS" type="number" min={0} max={100} />
			<FormField label="A" name="cutoffA" type="number" min={0} max={100} />
			<FormField label="B" name="cutoffB" type="number" min={0} max={100} />
			<FormField label="C" name="cutoffC" type="number" min={0} max={100} />
			<FormField label="D" name="cutoffD" type="number" min={0} max={100} />
			<FormField label="E" name="cutoffE" type="number" min={0} max={100} />
			<FormField label="F" name="cutoffF" type="number" min={0} max={100} />
		</div>
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="create-category">Create</Button>
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
	</div>
</section>
