export type DropPosition = 'above' | 'below';

export function createPointerReorder({
  rowSelector,
  idAttr,
  onCommit,
}: {
  rowSelector: string;
  idAttr: string;
  onCommit: (args: { fromId: string; toId: string; position: DropPosition }) => void;
}) {
  let listEl: HTMLElement | undefined = $state();
  let draggedId: string | null = $state(null);
  let dropTargetId: string | null = $state(null);
  let dropPosition: DropPosition = $state('below');

  function findTargetAt(clientY: number): { id: string; position: DropPosition } | null {
    if (!listEl) return null;
    const rows = listEl.querySelectorAll<HTMLElement>(rowSelector);
    for (const r of rows) {
      const id = r.getAttribute(idAttr);
      if (!id || id === draggedId) continue;
      const rect = r.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return {
          id,
          position: clientY < rect.top + rect.height / 2 ? 'above' : 'below',
        };
      }
    }
    return null;
  }

  function reset(handle: HTMLElement, pointerId: number) {
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    draggedId = null;
    dropTargetId = null;
  }

  function handlers(id: string) {
    return {
      onpointerdown(e: PointerEvent) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        const handle = e.currentTarget as HTMLElement;
        handle.setPointerCapture(e.pointerId);
        draggedId = id;
      },
      onpointermove(e: PointerEvent) {
        if (draggedId === null) return;
        e.preventDefault();
        const target = findTargetAt(e.clientY);
        if (target) {
          dropTargetId = target.id;
          dropPosition = target.position;
        } else {
          dropTargetId = null;
        }
      },
      onpointerup(e: PointerEvent) {
        const handle = e.currentTarget as HTMLElement;
        const fromId = draggedId;
        const toId = dropTargetId;
        const position = dropPosition;
        reset(handle, e.pointerId);
        if (fromId !== null && toId !== null) {
          onCommit({ fromId, toId, position });
        }
      },
      onpointercancel(e: PointerEvent) {
        reset(e.currentTarget as HTMLElement, e.pointerId);
      },
    };
  }

  return {
    get draggedId() {
      return draggedId;
    },
    get dropTargetId() {
      return dropTargetId;
    },
    get dropPosition() {
      return dropPosition;
    },
    bindList(el: HTMLElement | undefined) {
      listEl = el;
    },
    handlers,
  };
}

export function applyReorder<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string,
  position: DropPosition,
): T[] {
  const fromIndex = items.findIndex((i) => i.id === fromId);
  const toIndex = items.findIndex((i) => i.id === toId);
  if (fromIndex === -1 || toIndex === -1) return items;
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return items;
  const insertAt =
    fromIndex < toIndex
      ? position === 'above'
        ? toIndex - 1
        : toIndex
      : position === 'above'
        ? toIndex
        : toIndex + 1;
  reordered.splice(insertAt, 0, moved);
  return reordered;
}
