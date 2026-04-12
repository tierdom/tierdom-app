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
  let dragging = $state(false);

  let hasExisting = $derived(!removeImage && !!imageHash);
  let hasImage = $derived(hasExisting || !!previewUrl);

  function applyFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    removeImage = false;
    onchange?.();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) applyFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) applyFile(file);
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
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
    <div
      role="presentation"
      class="relative h-24 w-24 rounded border object-cover transition-colors {dragging
        ? 'border-accent bg-accent/10'
        : hasImage
          ? 'border-subtle'
          : 'border-dashed border-subtle'}"
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragenter={() => (dragging = true)}
      ondragleave={() => (dragging = false)}
      ondrop={handleDrop}
    >
      {#if hasImage}
        <img
          src={previewUrl ?? `/assets/images/${imageHash}.webp`}
          alt="Preview"
          class="h-full w-full rounded object-cover"
        />
      {:else}
        <div class="flex h-full w-full flex-col items-center justify-center gap-1 text-secondary">
          <ImagePlus size={20} />
          <span class="text-center text-[10px] leading-tight">Drop image here</span>
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        class="inline-flex cursor-pointer items-center gap-1.5 rounded border border-subtle px-3 py-1.5 text-xs text-secondary hover:border-accent hover:text-primary"
      >
        <ImagePlus size={14} />
        {hasImage ? 'Replace' : 'Upload'}
        <input
          type="file"
          name="image"
          accept="image/*"
          class="hidden"
          onchange={handleFileChange}
        />
      </label>
      <span class="text-[10px] text-secondary">Ideally 250 &times; 250 px</span>
      {#if hasImage}
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-1 text-xs text-red-400 hover:text-red-300"
          onclick={handleRemove}
        >
          <Trash2 size={12} />Remove
        </button>
      {/if}
    </div>
  </div>
</div>
