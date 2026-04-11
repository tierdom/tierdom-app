<script lang="ts">
	import Prose from '$lib/components/Prose.svelte';
	import { scoreToBarColor, tierColors } from '$lib/tier';

	type Tag = { slug: string; label: string };

	type Props = {
		name: string;
		score: number;
		descriptionHtml?: string | null;
		tier: string;
		tags?: Tag[];
		image?: string | null;
	};

	let { name, score, descriptionHtml, tier, tags = [], image }: Props = $props();

	let barColor = $derived(scoreToBarColor(score));
</script>

<div class="flex flex-col gap-4">
	<h2 class="pr-8 text-xl font-bold text-primary">{name}</h2>

	<div class="flex items-center gap-3">
		<span
			class="inline-flex h-8 w-8 items-center justify-center rounded text-sm font-black"
			style:background={tierColors[tier as keyof typeof tierColors]?.bg ?? 'var(--c-subtle)'}
			style:color="#0a0a0a"
		>
			{tier}
		</span>
		<span class="text-lg font-bold text-primary">{score}</span>
		<span class="text-sm text-secondary">/ 100</span>
	</div>

	<div class="h-3 w-full overflow-hidden bg-black/30">
		<div class="h-full opacity-80" style:width="{score}%" style:background={barColor}></div>
	</div>

	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each tags as t (t.slug)}
				<span class="rounded-full border border-subtle px-2.5 py-0.5 text-xs text-secondary"
					>{t.label}</span
				>
			{/each}
		</div>
	{/if}

	{#if descriptionHtml}
		<Prose html={descriptionHtml} size="sm" />
	{:else}
		<p class="text-sm leading-relaxed text-secondary">
			This is a placeholder review. The actual review content will appear here once it has been
			written. It will contain thoughts, opinions, and a detailed assessment of this item — covering
			what makes it stand out, where it falls short, and how it compares to similar entries in the
			list.
		</p>
	{/if}

	{#if image}
		<div class="flex items-start gap-3">
			<img
				src={image}
				alt={name}
				class="aspect-square h-24 rounded border border-subtle object-cover"
			/>
		</div>
	{/if}
</div>
