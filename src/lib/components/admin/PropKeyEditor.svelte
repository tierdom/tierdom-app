<script lang="ts">
  import { flip } from 'svelte/animate';
  import { Plus, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import { MAX_PROP_KEYS, MAX_KEY_LENGTH, type PropKeyConfig } from '$lib/props';
  import { iconSets } from '$lib/icon-sets';
  import { createPointerReorder, applyReorder } from './pointer-reorder.svelte';

  type InternalKey = { id: string; key: string; iconSet?: string; showOnCard?: boolean };

  let {
    propKeys,
    onchange,
  }: {
    propKeys: PropKeyConfig[];
    onchange: () => void;
  } = $props();

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore state_referenced_locally — intentional: mutable copy of initial prop
  let items = $state<InternalKey[]>(
    propKeys.map((pk) => ({
      id: crypto.randomUUID(),
      key: pk.key,
      iconSet: pk.iconSet,
      showOnCard: pk.showOnCard ?? false,
    })),
  );

  function emit() {
    onchange();
  }

  let listEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    reorder.bindList(listEl);
  });

  const reorder = createPointerReorder({
    rowSelector: '.prop-key-row',
    idAttr: 'data-key-id',
    onCommit: ({ fromId, toId, position }) => {
      items = applyReorder(items, fromId, toId, position);
      emit();
    },
  });

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

  function handleShowOnCardChange(id: string, value: boolean) {
    items = items.map((k) => (k.id === id ? { ...k, showOnCard: value } : k));
    emit();
  }

  let serialized = $derived(
    JSON.stringify(
      items.map((i) => ({
        key: i.key,
        ...(i.iconSet ? { iconSet: i.iconSet } : {}),
        ...(i.showOnCard ? { showOnCard: true } : {}),
      })),
    ),
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
  <legend class="text-xs font-medium text-secondary">Properties</legend>
  <p class="text-xs text-secondary">
    Properties suggested for items in this category. Order determines autocomplete priority.
  </p>

  {#if items.length > 0}
    <div class="prop-key-list" role="list" bind:this={listEl}>
      {#each items as item (item.id)}
        <div
          class="prop-key-row"
          data-key-id={item.id}
          class:dragging={reorder.draggedId === item.id}
          class:drop-above={reorder.dropTargetId === item.id && reorder.dropPosition === 'above'}
          class:drop-below={reorder.dropTargetId === item.id && reorder.dropPosition === 'below'}
          role="listitem"
          animate:flip={{ duration: 200 }}
        >
          <button
            type="button"
            class="drag-handle"
            aria-label="Drag to reorder"
            {...reorder.handlers(item.id)}
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
            class="key-input min-w-0 rounded border bg-surface px-2 py-1.5 text-sm text-primary placeholder:text-secondary/50 focus:outline-none {isDuplicate(
              item.key,
            )
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-subtle focus:border-accent'}"
          />

          <select
            aria-label="Icon set for {item.key || 'this key'}"
            value={item.iconSet ?? ''}
            onchange={(e) => handleIconSetChange(item.id, e.currentTarget.value)}
            class="iconset-select min-w-0 rounded border border-subtle bg-surface px-2 py-1.5 text-xs text-secondary focus:border-accent focus:outline-none"
          >
            <option value="">No icons</option>
            {#each iconSets as set (set.slug)}
              <option value={set.slug}>{set.name}</option>
            {/each}
          </select>

          <label
            class="show-card-cell flex items-center gap-1.5 text-xs text-secondary select-none"
            title="Show this property's value on the item square in the public tier list"
          >
            <input
              type="checkbox"
              checked={item.showOnCard ?? false}
              onchange={(e) => handleShowOnCardChange(item.id, e.currentTarget.checked)}
              aria-label="Show {item.key || 'this property'} on item square"
            />
            <span>Show on card</span>
          </label>

          <span class="delete-cell">
            <Button
              variant="danger-ghost"
              compact
              type="button"
              aria-label="Remove property"
              onclick={() => remove(item.id)}
            >
              <Trash2 size={12} aria-hidden="true" />
            </Button>
          </span>
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
      <Plus size={12} />Add property
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
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      'handle key delete'
      'handle iconset delete'
      'handle showcard delete';
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0;
    position: relative;
    transition: opacity 150ms ease;
  }

  @media (min-width: 640px) {
    .prop-key-row {
      grid-template-columns: auto 1fr 9rem auto auto;
      grid-template-areas: 'handle key iconset showcard delete';
    }
  }

  .prop-key-row .drag-handle {
    grid-area: handle;
  }

  .prop-key-row .key-input {
    grid-area: key;
  }

  .prop-key-row .iconset-select {
    grid-area: iconset;
    width: 100%;
  }

  .prop-key-row .show-card-cell {
    grid-area: showcard;
    cursor: pointer;
    white-space: nowrap;
  }

  .prop-key-row .delete-cell {
    grid-area: delete;
    display: inline-flex;
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
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .drag-handle:hover {
    color: var(--c-primary);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  @media (pointer: coarse) {
    .drag-handle {
      padding: 0.625rem;
      min-width: 44px;
      min-height: 44px;
    }
  }

  .drag-handle-spacer {
    flex-shrink: 0;
    width: calc(16px + 0.5rem);
    margin-right: 0.375rem;
  }

  @media (pointer: coarse) {
    .drag-handle-spacer {
      width: 44px;
    }
  }
</style>
