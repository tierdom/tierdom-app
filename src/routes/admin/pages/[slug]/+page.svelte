<script lang="ts">
	import { Save } from 'lucide-svelte';
	import Button from '$lib/components/admin/Button.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
	import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
	import Timestamps from '$lib/components/admin/Timestamps.svelte';
	import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const loader = createAdminLoader();
	const { enhance } = loader;
</script>

<svelte:head>
	<title>Edit {data.page.title} — Admin — tierdom</title>
</svelte:head>

<section>
	<div class="flex items-center gap-3">
		<a href="/admin/pages" class="text-sm text-secondary hover:text-primary">&larr; Pages</a>
		<h1 class="text-xl font-bold text-primary">Edit: {data.page.title}</h1>
		<Timestamps createdAt={data.page.createdAt} updatedAt={data.page.updatedAt} />
	</div>

	<form method="POST" action="?/update" use:enhance class="mt-6 flex flex-col gap-4">
		<FormField label="Title" name="title" value={data.page.title} required />
		<MarkdownField value={data.page.content} required />
		<div>
			<Button type="submit"><Save size={16} />Save</Button>
		</div>
	</form>
</section>

<AdminOverlay loading={loader.loading} />
