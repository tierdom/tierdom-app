<script lang="ts">
  import { resolve } from '$app/paths';
  import { AlertTriangle, Check, CheckCircle2, RotateCcw } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ImportResult } from '$lib/server/import/types';

  type Props = {
    result: ImportResult | null;
    failureMessage: string | null;
    filename: string | null;
    strategyUsed: string | null;
    onImportAgain: () => void;
  };

  let { result, failureMessage, filename, strategyUsed, onImportAgain }: Props = $props();

  function totalCount(group: { categories: number; items: number }) {
    return group.categories + group.items;
  }
</script>

<div aria-live="polite">
  {#if failureMessage}
    <div
      class="flex items-start gap-3 rounded-lg border border-subtle bg-elevated px-5 py-4 text-sm"
      role="alert"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <p class="text-primary">{failureMessage}</p>
    </div>
  {:else if result}
    {@const errorCount = result.errors.length}
    <div class="flex flex-col items-center text-center">
      {#if errorCount === 0}
        <CheckCircle2 class="h-10 w-10 text-accent" aria-hidden="true" />
        <h2 class="mt-3 text-xl font-bold text-primary">Import finished</h2>
      {:else}
        <AlertTriangle class="h-10 w-10 text-accent" aria-hidden="true" />
        <h2 class="mt-3 text-xl font-bold text-primary">Import rejected</h2>
      {/if}
      {#if filename}
        <p class="mt-1 text-xs text-secondary">
          {filename}{strategyUsed ? ` — ${strategyUsed} mode` : ''}
        </p>
      {/if}
    </div>

    {#if errorCount === 0}
      <dl class="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-center text-xs text-secondary">
        <div class="rounded-lg border border-subtle bg-elevated px-3 py-3">
          <dt class="tracking-wide uppercase">Inserted</dt>
          <dd class="mt-1 text-base font-bold text-primary">{totalCount(result.inserted)}</dd>
        </div>
        <div class="rounded-lg border border-subtle bg-elevated px-3 py-3">
          <dt class="tracking-wide uppercase">Updated</dt>
          <dd class="mt-1 text-base font-bold text-primary">{totalCount(result.updated)}</dd>
        </div>
        <div class="rounded-lg border border-subtle bg-elevated px-3 py-3">
          <dt class="tracking-wide uppercase">Skipped</dt>
          <dd class="mt-1 text-base font-bold text-primary">{totalCount(result.skipped)}</dd>
        </div>
      </dl>
      <p class="mt-3 text-center text-xs text-secondary">
        Categories {result.inserted.categories + result.updated.categories} / items {result.inserted
          .items + result.updated.items}.
      </p>
    {:else}
      <ul
        class="mx-auto mt-6 max-w-2xl list-disc space-y-1 rounded-lg border border-subtle bg-elevated px-8 py-4 pl-12 text-xs text-secondary"
      >
        {#each result.errors.slice(0, 20) as err, i (i)}
          <li class="font-mono">{err}</li>
        {/each}
        {#if errorCount > 20}
          <li>… {errorCount - 20} more</li>
        {/if}
      </ul>
    {/if}

    {#if result.details.inserted.length + result.details.updated.length + result.details.skipped.length > 0}
      <details class="mx-auto mt-6 max-w-2xl rounded-lg border border-subtle bg-elevated">
        <summary class="cursor-pointer px-5 py-3 text-sm text-secondary hover:text-primary">
          Details…
        </summary>
        <div class="space-y-4 border-t border-subtle px-5 py-4 text-xs">
          {#each [{ key: 'inserted', label: 'Inserted', items: result.details.inserted }, { key: 'updated', label: 'Updated', items: result.details.updated }, { key: 'skipped', label: 'Skipped', items: result.details.skipped }] as group (group.key)}
            {#if group.items.length > 0}
              <div>
                <p class="font-medium tracking-wide text-primary uppercase">
                  {group.label} ({group.items.length})
                </p>
                <ul class="mt-1 space-y-0.5 pl-4 text-secondary">
                  {#each group.items as path, i (i)}
                    <li class="font-mono">{path}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/each}
        </div>
      </details>
    {/if}
  {/if}

  <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
    <Button variant="secondary" type="button" onclick={onImportAgain}>
      <RotateCcw size={14} aria-hidden="true" />
      Import again
    </Button>
    <Button href={resolve('/admin/tools/import')}>
      <Check size={14} aria-hidden="true" />
      Done
    </Button>
  </div>
</div>
