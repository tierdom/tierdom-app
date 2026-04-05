<script lang="ts">
	import Prose from '$lib/components/Prose.svelte';

	type Tag = { slug: string; label: string };

	type Props = {
		name: string;
		score: number;
		descriptionHtml?: string | null;
		tier: string;
		tags?: Tag[];
	};

	let { name, score, descriptionHtml, tier, tags = [] }: Props = $props();

	let barColor = $derived(`hsl(${(score / 100) * 120}, 70%, 45%)`);

	const tierBg: Record<string, string> = {
		S: 'var(--tier-s-bg)',
		A: 'var(--tier-a-bg)',
		B: 'var(--tier-b-bg)',
		C: 'var(--tier-c-bg)',
		D: 'var(--tier-d-bg)',
		E: 'var(--tier-e-bg)',
		F: 'var(--tier-f-bg)'
	};
</script>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<h2 class="pr-8 text-xl font-bold text-primary">{name}</h2>

	<!-- Tier badge + score -->
	<div class="flex items-center gap-3">
		<span
			class="inline-flex h-8 w-8 items-center justify-center rounded text-sm font-black"
			style:background={tierBg[tier] ?? 'var(--c-subtle)'}
			style:color="#0a0a0a"
		>
			{tier}
		</span>
		<span class="text-lg font-bold text-primary">{score}</span>
		<span class="text-sm text-secondary">/ 100</span>
	</div>

	<!-- Score bar -->
	<div class="h-3 w-full overflow-hidden bg-black/30">
		<div class="h-full opacity-80" style:width="{score}%" style:background={barColor}></div>
	</div>

	<!-- Tags -->
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each tags as t (t.slug)}
				<span class="rounded-full border border-subtle px-2.5 py-0.5 text-xs text-secondary"
					>{t.label}</span
				>
			{/each}
		</div>
	{/if}

	<!-- Description / review -->
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
</div>
