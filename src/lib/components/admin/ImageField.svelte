<script lang="ts">
	import { ImagePlus, Trash2 } from 'lucide-svelte';

	let {
		imageHash = null,
		onchange
	}: {
		imageHash?: string | null;
		onchange?: () => void;
	} = $props();

	let removeImage = $state(false);
	let previewUrl = $state<string | null>(null);

	let hasExisting = $derived(!removeImage && !!imageHash);

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			previewUrl = URL.createObjectURL(file);
			removeImage = false;
			onchange?.();
		}
	}

	function handleRemove() {
		removeImage = true;
		onchange?.();
	}
</script>

<div class="flex flex-col gap-1">
	<span class="text-xs font-medium text-secondary">Image</span>
	{#if removeImage}
		<input type="hidden" name="removeImage" value="1" />
	{/if}
	<div class="flex items-start gap-3">
		{#if previewUrl || hasExisting}
			<img
				src={previewUrl ?? `/assets/images/${imageHash}.webp`}
				alt="Preview"
				class="h-24 w-24 rounded border border-subtle object-cover"
			/>
		{:else}
			<div
				class="flex h-24 w-24 items-center justify-center rounded border border-dashed border-subtle text-secondary"
			>
				<ImagePlus size={24} />
			</div>
		{/if}
		<div class="flex flex-col gap-1.5">
			<label
				class="inline-flex cursor-pointer items-center gap-1.5 rounded border border-subtle px-3 py-1.5 text-xs text-secondary hover:border-accent hover:text-primary"
			>
				<ImagePlus size={14} />
				{hasExisting || previewUrl ? 'Replace' : 'Upload'}
				<input
					type="file"
					name="image"
					accept="image/*"
					class="hidden"
					onchange={handleFileChange}
				/>
			</label>
			{#if hasExisting && !previewUrl}
				<button
					type="button"
					class="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
					onclick={handleRemove}
				>
					<Trash2 size={12} />Remove
				</button>
			{/if}
		</div>
	</div>
</div>
