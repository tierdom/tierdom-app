<script lang="ts">
  import { flip } from 'svelte/animate';
  import { Plus, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { Prop } from '$lib/props';
  import { MAX_PROPS, MAX_KEY_LENGTH, MAX_VALUE_LENGTH, findDuplicateKeys } from '$lib/props';

  type InternalProp = Prop & { id: string };

  let {
    props,
    onchange
  }: {
    props: Prop[];
    onchange: (props: Prop[]) => void;
  } = $props();

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore state_referenced_locally — intentional: mutable copy of initial prop
  let items = $state<InternalProp[]>(props.map((p) => ({ ...p, id: crypto.randomUUID() })));

  let draggedId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);
  let dropPosition = $state<'above' | 'below'>('below');

  function emit() {
    const stripped = items.map(({ key, value }) => ({ key, value }));
    onchange(stripped);
  }

  function add() {
    if (items.length >= MAX_PROPS) return;
    items = [...items, { id: crypto.randomUUID(), key: '', value: '' }];
    emit();
  }

  function remove(id: string) {
    items = items.filter((p) => p.id !== id);
    emit();
  }

  function handleInput(id: string, field: 'key' | 'value', value: string) {
    items = items.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    emit();
  }

  function handleDragStart(e: DragEvent, item: InternalProp) {
    draggedId = item.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    }
  }

  function handleDragOver(e: DragEvent, item: InternalProp) {
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

  function handleDragLeave(e: DragEvent, item: InternalProp) {
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

  let serialized = $derived(JSON.stringify(items.map(({ key, value }) => ({ key, value }))));

  let duplicateKeys = $derived(findDuplicateKeys(items));

  function isDuplicate(key: string): boolean {
    return duplicateKeys.has(key.trim().toLowerCase());
  }
</script>

<fieldset class="flex flex-col gap-1">
  <legend class="text-xs font-medium text-secondary">Props</legend>

  {#if items.length > 0}
    <div class="prop-list" role="list">
      {#each items as item (item.id)}
        <div
          class="prop-row"
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
            placeholder="Key"
            maxlength={MAX_KEY_LENGTH}
            value={item.key}
            oninput={(e) => handleInput(item.id, 'key', e.currentTarget.value)}
            class="flex-1 rounded border bg-surface px-2 py-1.5 text-sm text-primary placeholder:text-secondary/50 focus:outline-none {isDuplicate(
              item.key
            )
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-subtle focus:border-accent'}"
          />
          <input
            type="text"
            placeholder="Value"
            maxlength={MAX_VALUE_LENGTH}
            value={item.value}
            oninput={(e) => handleInput(item.id, 'value', e.currentTarget.value)}
            class="flex-2 rounded border border-subtle bg-surface px-2 py-1.5 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
          />

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
    <Button compact type="button" onclick={add} disabled={items.length >= MAX_PROPS}>
      <Plus size={12} />Add prop
    </Button>
  </div>

  <input type="hidden" name="props" value={serialized} />
</fieldset>

<style>
  .prop-list {
    display: flex;
    flex-direction: column;
  }

  .prop-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0;
    position: relative;
    transition: opacity 150ms ease;
  }

  .prop-row.dragging {
    opacity: 0.4;
  }

  .prop-row.drop-above::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-accent);
    border-radius: 1px;
  }

  .prop-row.drop-below::after {
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
