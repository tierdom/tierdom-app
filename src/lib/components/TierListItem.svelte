<script lang="ts">
	type Props = {
		name: string;
		score: number;
		image?: string;
		gradient?: string;
	};

	let { name, score, image, gradient }: Props = $props();

	/** Map 0-100 score to a hue: 0 = deep red (0°), 100 = bright green (120°) */
	let barColor = $derived(`hsl(${(score / 100) * 120}, 70%, 45%)`);
</script>

<div
	class="group relative aspect-square w-28 shrink-0 overflow-hidden sm:w-32 md:w-36"
	title={name}
>
	<!-- Background: image or placeholder gradient -->
	{#if image}
		<img src={image} alt={name} class="absolute inset-0 h-full w-full object-cover" />
	{:else if gradient}
		<div class="absolute inset-0" style:background={gradient}></div>
	{:else}
		<div
			class="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-elevated"
		></div>
	{/if}

	<!-- Title at top -->
	<div class="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-2">
		<span class="text-xs font-extrabold leading-tight text-white drop-shadow-md sm:text-sm">
			{name}
		</span>
	</div>

	<!-- Score number bottom-left, just above the bar -->
	<span
		class="absolute bottom-1.5 left-1.5 text-xs font-bold leading-none text-white drop-shadow-md"
	>
		{score}
	</span>

	<!-- Score bar at the very bottom -->
	<div class="absolute inset-x-0 bottom-0 h-1">
		<div class="h-full opacity-60" style:width="{score}%" style:background={barColor}></div>
	</div>
</div>
