<script lang="ts">
	import { scoreToBarColor } from '$lib/tier';

	type Props = {
		name: string;
		score: number;
		image?: string;
		gradient?: string;
		onclick?: () => void;
	};

	let { name, score, image, gradient, onclick }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (onclick && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			onclick();
		}
	}

	let barColor = $derived(scoreToBarColor(score));
</script>

<div
	class="group relative aspect-square w-1/2 cursor-pointer overflow-hidden border-2 border-black/90 transition-[border-color] duration-200 hover:border-black sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-[12.5%]"
	title={name}
	role="button"
	tabindex={0}
	{onclick}
	onkeydown={handleKeydown}
>
	<!-- Background: placeholder gradient underneath, then image on top -->
	{#if gradient}
		<div class="absolute inset-0" style:background-image={gradient}></div>
	{:else if !image}
		<div class="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-elevated"></div>
	{/if}
	{#if image}
		<img src={image} alt={name} class="absolute inset-0 h-full w-full object-cover" />
	{/if}

	<!-- Scrim overlay for text legibility (only over images) -->
	{#if image || gradient}
		<div
			class="absolute inset-0"
			style:background="linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 25%,
			rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.5) 100%)"
		></div>
	{/if}

	<!-- Title at top -->
	<div class="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-2">
		<span
			class="block origin-top-left pr-4 text-xs leading-tight font-extrabold text-white drop-shadow-md transition-transform duration-200 group-hover:scale-115 sm:text-sm"
		>
			{name}
		</span>
	</div>

	<!-- Score number bottom-left, just above the bar -->
	<span
		class="absolute bottom-3 left-1.5 block origin-bottom-left text-xs leading-none font-bold text-white drop-shadow-md transition-transform duration-200 group-hover:scale-115"
	>
		{score}
	</span>

	<!-- Score bar at the very bottom -->
	<div
		class="absolute inset-x-0 bottom-0 h-1 bg-black/30 transition-[height] duration-200 group-hover:h-2"
	>
		<div class="h-full opacity-60" style:width="{score}%" style:background={barColor}></div>
	</div>
</div>
