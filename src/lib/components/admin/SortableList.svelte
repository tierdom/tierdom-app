<script lang="ts">
	import { flip } from 'svelte/animate';
	import type { Snippet } from 'svelte';

	type Item = { id: number; [key: string]: unknown };

	let {
		items,
		onreorder,
		row
	}: {
		items: Item[];
		onreorder: (orderedIds: number[]) => void;
		row: Snippet<[item: Item]>;
	} = $props();

	let localItems = $derived([...items]);

	let draggedId = $state<number | null>(null);
	let dropTargetId = $state<number | null>(null);
	let dropPosition = $state<'above' | 'below'>('below');

	function handleDragStart(e: DragEvent, item: Item) {
		draggedId = item.id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(item.id));
		}
	}

	function handleDragOver(e: DragEvent, item: Item) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		if (draggedId === null || draggedId === item.id) {
			dropTargetId = null;
			return;
		}

		const row = (e.currentTarget as HTMLElement);
		const rect = row.getBoundingClientRect();
		const midY = rect.top + rect.height / 2;
		dropPosition = e.clientY < midY ? 'above' : 'below';
		dropTargetId = item.id;
	}

	function handleDragLeave(e: DragEvent, item: Item) {
		const row = e.currentTarget as HTMLElement;
		if (!row.contains(e.relatedTarget as Node)) {
			if (dropTargetId === item.id) {
				dropTargetId = null;
			}
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (draggedId === null || dropTargetId === null) return;

		const fromIndex = localItems.findIndex((i) => i.id === draggedId);
		const toIndex = localItems.findIndex((i) => i.id === dropTargetId);
		if (fromIndex === -1 || toIndex === -1) return;

		const reordered = [...localItems];
		const [moved] = reordered.splice(fromIndex, 1);

		let insertAt = toIndex;
		if (fromIndex < toIndex) {
			insertAt = dropPosition === 'above' ? toIndex - 1 : toIndex;
		} else {
			insertAt = dropPosition === 'above' ? toIndex : toIndex + 1;
		}
		reordered.splice(insertAt, 0, moved);
		localItems = reordered;

		onreorder(reordered.map((i) => i.id));

		draggedId = null;
		dropTargetId = null;
	}

	function handleDragEnd() {
		draggedId = null;
		dropTargetId = null;
	}
</script>

<div class="sortable-list" role="list">
	{#each localItems as item (item.id)}
		<div
			class="sortable-row"
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
	}

	.drag-handle:hover {
		color: var(--c-primary);
	}

	.drag-handle:active {
		cursor: grabbing;
	}
</style>
