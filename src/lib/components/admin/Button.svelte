<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'danger' | 'secondary' | 'table' | 'table-danger';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		children: Snippet;
	};

	let { variant = 'primary', children, ...rest }: Props = $props();

	const classes: Record<Variant, string> = {
		primary:
			'cursor-pointer inline-flex items-center justify-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80',
		danger:
			'cursor-pointer inline-flex items-center justify-center gap-1.5 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80',
		secondary:
			'cursor-pointer inline-flex items-center justify-center gap-1.5 rounded border border-subtle px-4 py-2 text-sm text-secondary transition-colors hover:text-primary',
		table:
			'cursor-pointer inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-xs text-secondary hover:bg-elevated hover:text-primary disabled:opacity-30',
		'table-danger':
			'cursor-pointer inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-400/10'
	};
</script>

<button class={classes[variant]} {...rest}>
	{@render children()}
</button>
