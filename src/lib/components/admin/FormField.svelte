<script lang="ts">
	type Props = {
		label: string;
		name: string;
		type?: 'text' | 'number';
		value?: string | number | null;
		required?: boolean;
		help?: string;
		multiline?: boolean;
		rows?: number;
		min?: number;
		max?: number;
		step?: number;
	};

	let {
		label,
		name,
		type = 'text',
		value = '',
		required = false,
		help,
		multiline = false,
		rows = 3,
		min,
		max,
		step
	}: Props = $props();

	const fieldClass =
		'rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none';
</script>

<div class="flex flex-col gap-1">
	<label for={name} class="text-xs font-medium text-secondary">
		{label}{#if required}<span class="text-red-400"> *</span>{/if}
	</label>
	{#if multiline}
		<textarea id={name} {name} {required} class={fieldClass} {rows}>{value ?? ''}</textarea>
	{:else}
		<input
			id={name}
			{name}
			{type}
			value={value ?? ''}
			{required}
			{min}
			{max}
			{step}
			class={fieldClass}
		/>
	{/if}
	{#if help}
		<p class="text-xs text-secondary/70">{help}</p>
	{/if}
</div>
