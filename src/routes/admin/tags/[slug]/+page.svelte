<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/admin/FormField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let dirty = $state(false);

	function markDirty() {
		dirty = true;
	}

	function cancel(e: MouseEvent) {
		if (dirty && !confirm('You have unsaved changes. Discard them?')) {
			e.preventDefault();
			return;
		}
		goto('/admin/tags');
	}
</script>

<svelte:head>
	<title>{data.tag.label} — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<button onclick={cancel} class="text-sm text-secondary hover:text-primary">
			&larr; Back to tags
		</button>
		<h1 class="text-xl font-bold text-primary">{data.tag.label}</h1>
	</div>

	<form
		method="POST"
		action="?/update"
		use:enhance
		oninput={markDirty}
		class="mt-6 flex flex-col gap-3"
	>
		<FormField label="Label" name="label" value={data.tag.label} required />
		<FormField label="Slug" name="slug" value={data.tag.slug} required />

		<div class="flex items-center gap-3">
			<button
				type="submit"
				class="rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
			>
				Save
			</button>
			<button
				type="button"
				onclick={cancel}
				class="rounded border border-subtle px-4 py-2 text-sm text-secondary transition-colors hover:text-primary"
			>
				Cancel
			</button>
		</div>
	</form>
</section>
