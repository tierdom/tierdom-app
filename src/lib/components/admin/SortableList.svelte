<script lang="ts">
  import { flip } from 'svelte/animate';
  import type { Snippet } from 'svelte';
  import { createPointerReorder, applyReorder } from './pointer-reorder.svelte';

  type Item = { id: string; [key: string]: unknown };

  let {
    items,
    onreorder,
    row
  }: {
    items: Item[];
    onreorder: (orderedIds: string[]) => void;
    row: Snippet<[item: Item]>;
  } = $props();

  let localItems = $derived([...items]);

  let listEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    reorder.bindList(listEl);
  });

  const reorder = createPointerReorder({
    rowSelector: '.sortable-row',
    idAttr: 'data-sortable-id',
    onCommit: ({ fromId, toId, position }) => {
      const next = applyReorder(localItems, fromId, toId, position);
      localItems = next;
      onreorder(next.map((i) => i.id));
    }
  });
</script>

<div class="sortable-list" role="list" bind:this={listEl}>
  {#each localItems as item (item.id)}
    <div
      class="sortable-row"
      data-sortable-id={item.id}
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
      {@render row(item)}
    </div>
  {/each}
</div>

<style>
  .sortable-list {
    display: flex;
    flex-direction: column;
  }

  .sortable-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    border-bottom: 1px solid color-mix(in srgb, var(--c-subtle) 50%, transparent);
    transition: opacity 150ms ease;
  }

  .sortable-row.dragging {
    opacity: 0.4;
  }

  .sortable-row.drop-above::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-accent);
    border-radius: 1px;
  }

  .sortable-row.drop-below::after {
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
</style>
