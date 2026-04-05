<script lang="ts">
	import { goto } from '$app/navigation';
	import { Save, X, Trash2 } from 'lucide-svelte';
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
		goto('/admin/tags');
	}
</script>

<svelte:head>
	<title>{data.tag.label} — Admin — tierdom</title>
</svelte:head>

<section>
	<AdminOverlay loading={loader.loading} />
	<div class="flex items-center gap-3">
		<button onclick={cancel} class="cursor-pointer text-sm text-secondary hover:text-primary">
			&larr; Back to tags
		</button>
		<h1 class="text-xl font-bold text-primary">{data.tag.label}</h1>
	</div>

	<form
		id="edit-tag"
		method="POST"
		action="?/update"
		use:enhance
		oninput={markDirty}
		class="mt-6 flex flex-col gap-3"
	>
		<FormField label="Label" name="label" value={data.tag.label} required />
		<FormField label="Slug" name="slug" value={data.tag.slug} required />
	</form>

	<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
		<Button type="submit" form="edit-tag"><Save size={16} />Save</Button>
		<Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this tag?')) e.preventDefault();
			}}
		>
			<Button variant="danger" type="submit"><Trash2 size={16} />Delete</Button>
		</form>
	</div>
</section>
