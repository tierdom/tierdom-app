<script lang="ts">
  import { resolve } from '$app/paths';
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    ExternalLink,
    Construction,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    RotateCcw,
    Check,
    Upload
  } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const importer = $derived(data.importer);
  const result = $derived(form && 'result' in form ? form.result : null);
  const failureMessage = $derived(form && 'message' in form ? form.message : null);
  const filename = $derived(form && 'filename' in form ? form.filename : null);
  const strategyUsed = $derived(form && 'strategy' in form ? form.strategy : null);
  const maxMb = $derived(Math.round(data.maxBytes / (1024 * 1024)));

  type Phase = 'form' | 'submitting' | 'result';
  // Default phase tracks whether the action produced a payload; the override
  // lets the user (or the in-flight submission) move to a different phase.
  let phaseOverride = $state<Phase | null>(null);
  const phase = $derived<Phase>(phaseOverride ?? (form ? 'result' : 'form'));

  function totalCount(group: { categories: number; items: number }) {
    return group.categories + group.items;
  }

  function importAgain() {
    phaseOverride = 'form';
  }
</script>

<svelte:head>
  <title>{importer.label} import — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">{importer.label} import</h1>

<section>
  {#if importer.status === 'stub'}
    <a
      href={resolve('/admin/tools/import')}
      class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
    >
      <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
    </a>
    <h2 class="mt-2 text-xl font-bold text-primary">{importer.label}</h2>
    <p class="mt-1 text-sm text-secondary">{importer.description}</p>

    <div class="mt-6 flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4">
      <Construction class="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <div class="min-w-0 text-sm text-secondary">
        <p class="font-medium text-primary">Coming soon</p>
        <p class="mt-1">
          This importer isn't built yet. In the meantime you can wrangle your data into the
          <a class="text-accent underline" href={resolve('/schemas/tierdom-import-v1.json')}
            >Tierdom JSON Schema</a
          >
          and use the
          <a class="text-accent underline" href={resolve('/admin/tools/import/json')}
            >Tierdom JSON</a
          > importer.
        </p>
        {#if importer.stubInfo}
          <p class="mt-3">
            <a
              href={importer.stubInfo.issueUrl}
              target="_blank"
              rel="noreferrer noopener external"
              class="inline-flex items-center gap-1 text-accent hover:underline"
            >
              {#if importer.stubInfo.sampleNeeded}Open an issue with a sample export{:else}Suggest a
                new format{/if}
              <ExternalLink class="h-3 w-3" aria-hidden="true" />
            </a>
          </p>
        {/if}
      </div>
    </div>
  {:else if phase === 'submitting'}
    <div class="mt-10 flex flex-col items-center text-center" aria-live="polite">
      <Loader2 class="h-10 w-10 animate-spin text-accent" aria-hidden="true" />
      <h2 class="mt-4 text-xl font-bold text-primary">Importing…</h2>
      <p class="mt-2 max-w-md text-sm text-secondary">Validating and writing to the database.</p>
    </div>
  {:else if phase === 'result'}
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
          <dl
            class="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-center text-xs text-secondary"
          >
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
            Categories {result.inserted.categories + result.updated.categories} / items {result
              .inserted.items + result.updated.items}.
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
        <Button variant="secondary" type="button" onclick={importAgain}>
          <RotateCcw size={14} aria-hidden="true" />
          Import again
        </Button>
        <Button href={resolve('/admin/tools/import')}>
          <Check size={14} aria-hidden="true" />
          Done
        </Button>
      </div>
    </div>
  {:else}
    <a
      href={resolve('/admin/tools/import')}
      class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
    >
      <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
    </a>
    <h2 class="mt-2 text-xl font-bold text-primary">{importer.label}</h2>
    <p class="mt-1 text-sm text-secondary">{importer.description}</p>

    <form
      method="POST"
      enctype="multipart/form-data"
      use:enhance={() => {
        phaseOverride = 'submitting';
        return async ({ update }) => {
          await update({ reset: false });
          phaseOverride = 'result';
        };
      }}
      class="mt-6 space-y-4 rounded-lg border border-subtle bg-elevated px-5 py-4"
    >
      <div>
        <label for="import-file" class="block text-sm font-medium text-primary">File</label>
        <input
          id="import-file"
          name="file"
          type="file"
          accept={importer.accept}
          required
          class="mt-2 block w-full text-sm text-secondary file:mr-3 file:rounded-md file:border file:border-subtle file:bg-canvas file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:border-accent/40"
        />
        <p class="mt-1 text-xs text-secondary">Maximum {maxMb} MB.</p>
      </div>

      <fieldset class="space-y-2">
        <legend class="text-sm font-medium text-primary">Conflict strategy</legend>
        <label class="flex items-start gap-2 text-sm text-secondary">
          <input type="radio" name="strategy" value="skip" checked class="mt-0.5" />
          <span>
            <span class="font-medium text-primary">Skip</span> — leave existing items alone; only insert
            items whose slugs aren't already taken.
          </span>
        </label>
        <label class="flex items-start gap-2 text-sm text-secondary">
          <input type="radio" name="strategy" value="overwrite" class="mt-0.5" />
          <span>
            <span class="font-medium text-primary">Overwrite</span> — replace existing items that share
            a slug. Destructive.
          </span>
        </label>
      </fieldset>

      <Button type="submit" variant="primary">
        <Upload size={14} aria-hidden="true" />
        Import
      </Button>
    </form>
  {/if}
</section>
