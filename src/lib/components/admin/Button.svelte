<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'danger' | 'danger-ghost' | 'secondary';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		compact?: boolean;
		children: Snippet;
	};

	let { variant = 'primary', compact = false, children, ...rest }: Props = $props();

	const base = 'cursor-pointer inline-flex items-center justify-center rounded';
	let size = $derived(compact ? 'gap-1 px-2 py-1 text-xs' : 'gap-1.5 px-4 py-2 text-sm');

	const styles: Record<Variant, string> = {
		primary: 'bg-accent font-semibold text-canvas transition-opacity hover:opacity-80',
		danger: 'bg-red-600 font-semibold text-white transition-opacity hover:opacity-80',
		'danger-ghost': 'text-red-400 hover:bg-red-400/10',
		secondary: 'border border-subtle text-secondary transition-colors hover:text-primary'
	};
</script>

<button class="{base} {size} {styles[variant]}" {...rest}>
	{@render children()}
</button>
