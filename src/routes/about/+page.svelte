<script lang="ts">
	import type { PageData } from './$types';
	import Prose from '$lib/components/Prose.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.page.title} — tierdom</title>
</svelte:head>

<Prose html={data.page.contentHtml} class="mx-auto max-w-2xl py-12" />
