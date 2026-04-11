<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'danger' | 'secondary' | 'table' | 'table-danger';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		children: Snippet;
	};

	let { variant = 'primary', children, ...rest }: Props = $props();

	const base = 'cursor-pointer inline-flex items-center justify-center rounded';
	const regular = `${base} gap-1.5 px-4 py-2 text-sm`;
	const table = `${base} gap-1 px-2 py-1 text-xs`;

	const classes: Record<Variant, string> = {
		primary: `${regular} bg-accent font-semibold text-canvas transition-opacity hover:opacity-80`,
		danger: `${regular} bg-red-600 font-semibold text-white transition-opacity hover:opacity-80`,
		secondary: `${regular} border border-subtle text-secondary transition-colors hover:text-primary`,
		table: `${table} text-secondary hover:bg-elevated hover:text-primary disabled:opacity-30`,
		'table-danger': `${table} text-red-400 hover:bg-red-400/10`
	};
</script>

<button class={classes[variant]} {...rest}>
	{@render children()}
</button>
