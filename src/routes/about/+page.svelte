<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.page.title} — tierdom</title>
</svelte:head>

<article class="mx-auto prose max-w-2xl py-12 prose-invert">
	<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitised by DOMPurify server-side -->
	{@html data.page.contentHtml}
</article>
