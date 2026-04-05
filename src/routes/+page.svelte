<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tiers = [
		{ letter: 'S', label: 'Perfection', color: 'var(--tier-s-bg)' },
		{ letter: 'A', label: 'Fantastic', color: 'var(--tier-a-bg)' },
		{ letter: 'B', label: 'Great', color: 'var(--tier-b-bg)' },
		{ letter: 'C', label: 'Decent', color: 'var(--tier-c-bg)' },
		{ letter: 'D', label: 'Meh', color: 'var(--tier-d-bg)' },
		{ letter: 'E', label: 'Rubbish', color: 'var(--tier-e-bg)' },
		{ letter: 'F', label: 'Abysmal', color: 'var(--tier-f-bg)' }
	];
</script>

<svelte:head>
	<title>Home — tierdom</title>
</svelte:head>

<!-- CMS hero -->
{#if data.page?.contentHtml}
	<section class="py-16 text-center md:py-24">
		<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitised by DOMPurify server-side -->
		<div class="mx-auto prose prose-lg max-w-xl prose-invert">{@html data.page.contentHtml}</div>
	</section>
{/if}

<!-- Categories -->
{#if data.categoriesWithCounts.length > 0}
	<section class="pb-16">
		<h2 class="mb-6 text-center text-sm font-semibold tracking-widest text-secondary uppercase">
			Browse the lists
		</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.categoriesWithCounts as cat (cat.id)}
				<a
					href={resolve(`/category/${cat.slug}`)}
					class="group rounded-lg border border-subtle bg-surface p-6 transition-colors hover:border-accent/40 hover:bg-elevated"
				>
					<h3 class="text-lg font-bold text-primary group-hover:text-accent">
						{cat.name}
					</h3>
					{#if cat.descriptionHtml}
						<div class="prose prose-sm mt-1 line-clamp-2 prose-invert [&>*]:m-0">
							<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitised by DOMPurify server-side -->
							{@html cat.descriptionHtml}
						</div>
					{/if}
					<p class="mt-3 text-xs text-secondary/60">
						{cat.itemCount}
						{cat.itemCount === 1 ? 'item' : 'items'} ranked
					</p>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- Tier system -->
<section class="pb-16">
	<h2 class="mb-6 text-center text-sm font-semibold tracking-widest text-secondary uppercase">
		The tier system
	</h2>
	<div class="mx-auto flex max-w-md flex-col gap-1">
		{#each tiers as { letter, label, color } (letter)}
			<div class="flex items-center gap-3 rounded border border-subtle bg-surface px-4 py-2">
				<span
					class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm font-black text-[#0a0a0a]"
					style:background-color={color}
				>
					{letter}
				</span>
				<span class="text-sm text-secondary">{label}</span>
			</div>
		{/each}
	</div>
	<p class="mt-4 text-center text-xs text-secondary/50">
		Inspired by the classic tier-maker ranking system (S through F).
	</p>
</section>
