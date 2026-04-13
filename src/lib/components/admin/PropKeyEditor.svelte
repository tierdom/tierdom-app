<script lang="ts">
  import { flip } from 'svelte/animate';
  import { Plus, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import { MAX_PROP_KEYS, MAX_KEY_LENGTH, type PropKeyConfig } from '$lib/props';
  import { iconSets } from '$lib/icon-sets';

  type InternalKey = { id: string; key: string; iconSet?: string };

  let {
    propKeys,
    onchange
  }: {
    propKeys: PropKeyConfig[];
    onchange: () => void;
  } = $props();

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore state_referenced_locally — intentional: mutable copy of initial prop
  let items = $state<InternalKey[]>(
    propKeys.map((pk) => ({ id: crypto.randomUUID(), key: pk.key, iconSet: pk.iconSet }))
  );

  let draggedId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);
  let dropPosition = $state<'above' | 'below'>('below');

  function emit() {
    onchange();
  }

  function add() {
    if (items.length >= MAX_PROP_KEYS) return;
    items = [...items, { id: crypto.randomUUID(), key: '' }];
    emit();
  }

  function remove(id: string) {
    items = items.filter((k) => k.id !== id);
    emit();
  }

  function handleInput(id: string, value: string) {
    items = items.map((k) => (k.id === id ? { ...k, key: value } : k));
    emit();
  }

  function handleIconSetChange(id: string, value: string) {
    items = items.map((k) => (k.id === id ? { ...k, iconSet: value || undefined } : k));
    emit();
  }

  function handleDragStart(e: DragEvent, item: InternalKey) {
    draggedId = item.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    }
  }

  function handleDragOver(e: DragEvent, item: InternalKey) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (draggedId === null || draggedId === item.id) {
      dropTargetId = null;
      return;
    }
    const row = e.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    dropPosition = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    dropTargetId = item.id;
  }

  function handleDragLeave(e: DragEvent, item: InternalKey) {
    const row = e.currentTarget as HTMLElement;
    if (!row.contains(e.relatedTarget as Node) && dropTargetId === item.id) {
      dropTargetId = null;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedId === null || dropTargetId === null) return;

    const fromIndex = items.findIndex((i) => i.id === draggedId);
    const toIndex = items.findIndex((i) => i.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    const insertAt =
      fromIndex < toIndex
        ? dropPosition === 'above'
          ? toIndex - 1
          : toIndex
        : dropPosition === 'above'
          ? toIndex
          : toIndex + 1;
    reordered.splice(insertAt, 0, moved);
    items = reordered;
    draggedId = null;
    dropTargetId = null;
    emit();
  }

  function handleDragEnd() {
    draggedId = null;
    dropTargetId = null;
  }

  let serialized = $derived(
    JSON.stringify(items.map((i) => ({ key: i.key, ...(i.iconSet ? { iconSet: i.iconSet } : {}) })))
  );

  let duplicateKeys = $derived.by(() => {
    const keys = items.map((i) => i.key.trim().toLowerCase()).filter(Boolean);
    return new Set(keys.filter((k, idx) => keys.indexOf(k) !== idx));
  });

  function isDuplicate(key: string): boolean {
    return duplicateKeys.has(key.trim().toLowerCase());
  }
</script>

<fieldset class="flex flex-col gap-1">
  <legend class="text-xs font-medium text-secondary">Prop keys</legend>
  <p class="text-xs text-secondary/70">
    Suggested keys for items in this category. Order determines autocomplete priority.
  </p>

  {#if items.length > 0}
    <div class="prop-key-list" role="list">
      {#each items as item (item.id)}
        <div
          class="prop-key-row"
          class:dragging={draggedId === item.id}
          class:drop-above={dropTargetId === item.id && dropPosition === 'above'}
          class:drop-below={dropTargetId === item.id && dropPosition === 'below'}
          role="listitem"
          ondragover={(e) => handleDragOver(e, item)}
          ondragleave={(e) => handleDragLeave(e, item)}
          ondrop={handleDrop}
          animate:flip={{ duration: 200 }}
        >
          <button
            type="button"
            class="drag-handle"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, item)}
            ondragend={handleDragEnd}
            aria-label="Drag to reorder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5.5" cy="3" r="1.5" />
              <circle cx="10.5" cy="3" r="1.5" />
              <circle cx="5.5" cy="8" r="1.5" />
              <circle cx="10.5" cy="8" r="1.5" />
              <circle cx="5.5" cy="13" r="1.5" />
              <circle cx="10.5" cy="13" r="1.5" />
            </svg>
          </button>

          <input
            type="text"
            placeholder="Key name"
            maxlength={MAX_KEY_LENGTH}
            value={item.key}
            oninput={(e) => handleInput(item.id, e.currentTarget.value)}
            class="flex-1 rounded border bg-surface px-2 py-1.5 text-sm text-primary placeholder:text-secondary/50 focus:outline-none {isDuplicate(
              item.key
            )
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-subtle focus:border-accent'}"
          />

          <select
            aria-label="Icon set for {item.key || 'this key'}"
            value={item.iconSet ?? ''}
            onchange={(e) => handleIconSetChange(item.id, e.currentTarget.value)}
            class="w-28 shrink-0 rounded border border-subtle bg-surface px-1.5 py-1.5 text-xs text-secondary focus:border-accent focus:outline-none"
          >
            <option value="">No icons</option>
            {#each iconSets as set (set.slug)}
              <option value={set.slug}>{set.name}</option>
            {/each}
          </select>

          <Button variant="danger-ghost" compact type="button" onclick={() => remove(item.id)}>
            <Trash2 size={12} />
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  {#if duplicateKeys.size > 0}
    <div class="flex">
      <div class="drag-handle-spacer"></div>
      <p class="text-xs text-red-400">Duplicate keys are not allowed</p>
    </div>
  {/if}

  <div class="mt-1 flex">
    <div class="drag-handle-spacer"></div>
    <Button compact type="button" onclick={add} disabled={items.length >= MAX_PROP_KEYS}>
      <Plus size={12} />Add key
    </Button>
  </div>

  <input type="hidden" name="propKeys" value={serialized} />
</fieldset>

<style>
  .prop-key-list {
    display: flex;
    flex-direction: column;
  }

  .prop-key-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0;
    position: relative;
    transition: opacity 150ms ease;
  }

  .prop-key-row.dragging {
    opacity: 0.4;
  }

  .prop-key-row.drop-above::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-accent);
    border-radius: 1px;
  }

  .prop-key-row.drop-below::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-accent);
    border-radius: 1px;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0.25rem;
    cursor: grab;
    color: var(--c-secondary);
    border: none;
    background: none;
    border-radius: 0.25rem;
    transition: color 150ms ease;
  }

  .drag-handle:hover {
    color: var(--c-primary);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .drag-handle-spacer {
    flex-shrink: 0;
    width: calc(16px + 0.5rem);
    margin-right: 0.375rem;
  }
</style>
