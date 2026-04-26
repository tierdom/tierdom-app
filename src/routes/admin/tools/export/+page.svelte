<script lang="ts">
  import { resolve } from '$app/paths';
  import { Download, Info, TriangleAlert, RotateCcw, Check } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';

  let submitted = $state(false);

  // Defaults: everything except the SQLite snapshot. The common case is
  // "give me the content + assets + Markdown" — full DB dumps are opt-in.
  let includeDb = $state(false);
  let includeJson = $state(true);
  let includeImages = $state(true);
  let includeMarkdown = $state(true);

  let noneSelected = $derived(!includeDb && !includeJson && !includeImages && !includeMarkdown);

  function onFormSubmit() {
    // Don't preventDefault — let the browser submit natively and download.
    // Defer the panel swap by one tick so the form stays in the DOM long
    // enough for the browser to dispatch the submission. Removing the form
    // synchronously (Svelte 5 flushes eagerly from event handlers) cancels
    // the in-flight request before the response can arrive.
    setTimeout(() => {
      submitted = true;
    }, 0);
  }

  function exportAgain() {
    submitted = false;
  }
</script>

<svelte:head>
  <title>Export — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">Export</h1>

<section>
  {#if submitted}
    <div class="mt-10 flex flex-col items-center text-center" aria-live="polite">
      <div class="mb-6 flex h-20 w-20 items-center justify-center">
        <span class="bob-icon flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <Download size={32} class="text-accent" aria-hidden="true" />
        </span>
      </div>
      <h2 class="text-xl font-bold text-primary">Your export is on its way</h2>
      <p class="mt-2 max-w-md text-sm text-secondary">
        Check your browser's downloads. Larger exports may take a moment to finish — keep this tab
        open while it streams.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" type="button" onclick={exportAgain}>
          <RotateCcw size={14} aria-hidden="true" />
          Export again
        </Button>
        <Button href={resolve('/admin/tools')}>
          <Check size={14} aria-hidden="true" />
          Done
        </Button>
      </div>
    </div>
  {:else}
    <p class="text-xs text-secondary">
      <a href={resolve('/admin/tools')} class="hover:text-primary">&larr; Tools</a>
    </p>
    <h2 class="mt-2 text-xl font-bold text-primary">Export</h2>
    <p class="mt-2 text-sm text-secondary">
      Pick what you want to take with you. The download starts as soon as you submit; the file
      streams directly from the server.
    </p>

    <form
      method="GET"
      action={resolve('/admin/tools/export/download')}
      data-sveltekit-reload
      onsubmit={onFormSubmit}
      class="mt-6 flex flex-col gap-4"
    >
      <fieldset class="flex flex-col gap-3 rounded-lg border border-subtle bg-elevated p-5">
        <legend class="px-2 text-sm font-medium text-primary">Include</legend>

        <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <input
            type="checkbox"
            name="db"
            value="1"
            bind:checked={includeDb}
            class="self-center accent-accent"
          />
          <span class="text-sm font-medium text-primary">SQLite database</span>
          <span class="col-start-2 flex items-start gap-1 text-xs text-secondary">
            <Info size={12} class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            Full snapshot of tier-list data — includes Trash, excludes admin users and sessions.
          </span>
        </label>

        <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <input
            type="checkbox"
            name="json"
            value="1"
            bind:checked={includeJson}
            class="self-center accent-accent"
          />
          <span class="text-sm font-medium text-primary">JSON content</span>
          <span class="col-start-2 flex items-start gap-1 text-xs text-amber-200">
            <TriangleAlert size={12} class="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
            Excludes soft-deleted (Trash) items. Use SQLite if you need them.
          </span>
        </label>

        <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <input
            type="checkbox"
            name="images"
            value="1"
            bind:checked={includeImages}
            class="self-center accent-accent"
          />
          <span class="text-sm font-medium text-primary">Images</span>
          <span class="col-start-2 text-xs text-secondary">
            All tier-list item images (.webp). Largest payload.
          </span>
        </label>

        <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <input
            type="checkbox"
            name="markdown"
            value="1"
            bind:checked={includeMarkdown}
            class="self-center accent-accent"
          />
          <span class="text-sm font-medium text-primary">Markdown</span>
          <span class="col-start-2 text-xs text-secondary">
            One file per category as a Markdown tier-list table. Export-only — use JSON or SQLite to
            re-import.
          </span>
        </label>
      </fieldset>

      <div class="flex items-center gap-3">
        <Button
          type="submit"
          disabled={noneSelected}
          title={noneSelected ? 'Pick at least one option to download.' : undefined}
        >
          <Download size={16} aria-hidden="true" />
          Download ZIP
        </Button>
        {#if noneSelected}
          <span class="text-xs text-secondary">Pick at least one option.</span>
        {/if}
      </div>
    </form>
  {/if}
</section>

<style>
  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  .bob-icon {
    animation: bob 1.8s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .bob-icon {
      animation: none;
    }
  }
</style>
