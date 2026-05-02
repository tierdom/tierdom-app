<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
    label?: string;
    children: Snippet;
  };

  let { open, onclose, label, children }: Props = $props();
  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (dialogEl?.open) dialogEl.close();
      document.body.style.overflow = '';
    };
  });

  function handleClick(e: MouseEvent) {
    if (e.target === dialogEl) onclose();
  }
</script>

<dialog
  bind:this={dialogEl}
  class="dialog"
  aria-label={label}
  onclick={handleClick}
  oncancel={(e) => {
    e.preventDefault();
    onclose();
  }}
>
  <div
    class="relative max-h-[85vh] w-[90vw] max-w-2xl overflow-y-auto border border-subtle bg-elevated p-6"
  >
    <button
      onclick={onclose}
      class="absolute top-2 right-2 cursor-pointer p-3 text-secondary transition-colors hover:text-primary"
      aria-label="Close"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
    {@render children()}
  </div>
</dialog>

<style>
  /* Native CSS: Tailwind has no first-class story for ::backdrop,
     @starting-style, or `transition: ... allow-discrete`. */
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
