<script lang="ts">
  import Button from './Button.svelte';

  type Variant = 'danger' | 'primary';

  type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: Variant;
    onconfirm: () => void;
    oncancel: () => void;
  };

  let {
    open,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onconfirm,
    oncancel
  }: Props = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let cancelEl: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
      document.body.style.overflow = 'hidden';
      cancelEl?.focus();
    }
    return () => {
      if (dialogEl?.open) dialogEl.close();
      document.body.style.overflow = '';
    };
  });

  function handleBackdrop(e: MouseEvent) {
    if (e.target === dialogEl) oncancel();
  }
</script>

<dialog
  bind:this={dialogEl}
  class="dialog"
  aria-labelledby="confirm-dialog-title"
  onclick={handleBackdrop}
  oncancel={(e) => {
    e.preventDefault();
    oncancel();
  }}
>
  <div class="w-[90vw] max-w-md border border-subtle bg-elevated p-5">
    <h2 id="confirm-dialog-title" class="text-base font-semibold text-primary">{title}</h2>
    <p class="mt-2 text-sm text-secondary">{message}</p>
    <div class="mt-5 flex justify-end gap-2">
      <button
        bind:this={cancelEl}
        type="button"
        onclick={oncancel}
        class="cursor-pointer rounded border border-subtle px-4 py-2 text-sm text-secondary transition-colors hover:text-primary"
      >
        {cancelLabel}
      </button>
      <Button {variant} type="button" onclick={onconfirm}>{confirmLabel}</Button>
    </div>
  </div>
</dialog>

<style>
  .dialog {
    background: transparent;
    border: none;
    padding: 0;
    margin: auto;
    max-width: none;
    max-height: none;
    overflow: visible;
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity 200ms ease,
      transform 200ms ease,
      overlay 200ms ease allow-discrete,
      display 200ms ease allow-discrete;
  }

  .dialog[open] {
    opacity: 1;
    transform: scale(1);
  }

  @starting-style {
    .dialog[open] {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  .dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    opacity: 0;
    transition:
      opacity 200ms ease,
      overlay 200ms ease allow-discrete,
      display 200ms ease allow-discrete;
  }

  .dialog[open]::backdrop {
    opacity: 1;
  }

  @starting-style {
    .dialog[open]::backdrop {
      opacity: 0;
    }
  }
</style>
