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
    requireTypedConfirmation?: string;
    typedConfirmationLabel?: string;
    typedConfirmationHint?: string;
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
    requireTypedConfirmation,
    typedConfirmationLabel = 'Type to confirm',
    typedConfirmationHint,
    onconfirm,
    oncancel,
  }: Props = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let cancelEl: HTMLButtonElement | undefined = $state();
  let typedValue = $state('');
  const confirmEnabled = $derived(
    !requireTypedConfirmation || typedValue.trim() === requireTypedConfirmation,
  );

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      typedValue = '';
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

  function handleConfirm() {
    if (confirmEnabled) onconfirm();
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
  <div class="w-[calc(100vw-2rem)] max-w-md border border-subtle bg-elevated p-5">
    <h2 id="confirm-dialog-title" class="text-base font-semibold text-primary">{title}</h2>
    <p class="mt-2 text-sm text-secondary">{message}</p>
    {#if requireTypedConfirmation}
      <p class="mt-3 text-xs text-secondary">
        {#if typedConfirmationHint}
          {typedConfirmationHint}
        {:else}
          Type <code class="rounded bg-subtle/30 px-1 text-primary">{requireTypedConfirmation}</code
          >
          to confirm.
        {/if}
      </p>
      <label class="mt-2 flex flex-col gap-1">
        <span class="sr-only">{typedConfirmationLabel}</span>
        <input
          type="text"
          bind:value={typedValue}
          autocomplete="off"
          aria-label={typedConfirmationLabel}
          class="rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
        />
      </label>
    {/if}
    <div class="mt-5 flex justify-end gap-2">
      <button
        bind:this={cancelEl}
        type="button"
        onclick={oncancel}
        class="cursor-pointer rounded border border-subtle px-4 py-2 text-sm text-secondary transition-colors hover:text-primary"
      >
        {cancelLabel}
      </button>
      <Button {variant} type="button" disabled={!confirmEnabled} onclick={handleConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </div>
</dialog>

<style>
  .dialog {
    background: transparent;
    border: none;
    padding: 0;
    inset: 0;
    margin: 0;
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
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
    display: flex;
    align-items: center;
    justify-content: center;
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
