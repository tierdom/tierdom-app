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
  import type { ProposedCategory } from '$lib/server/import/types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const importer = $derived(data.importer);
  const result = $derived(form && 'result' in form ? form.result : null);
  const failureMessage = $derived(form && 'message' in form ? form.message : null);
  const filename = $derived(form && 'filename' in form ? form.filename : null);
  const strategyUsed = $derived(form && 'strategy' in form ? form.strategy : null);
  const plan = $derived(form && 'plan' in form ? form.plan : null);
  const cancelled = $derived(Boolean(form && 'cancelled' in form && form.cancelled));
  const maxMb = $derived(Math.round(data.maxBytes / (1024 * 1024)));

  type Phase = 'form' | 'planning' | 'review' | 'committing' | 'result';
  let phaseOverride = $state<Phase | null>(null);

  // The default phase is derived from whatever the most recent form action
  // returned. The override lets us flip into transient phases (planning /
  // committing for the loading spinner; form for "Import again" / cancel).
  const phase = $derived<Phase>(
    phaseOverride ??
      (cancelled || (!plan && !result) ? 'form' : result ? 'result' : plan ? 'review' : 'form')
  );

  type Edit = {
    fileSlug: string;
    fileName: string;
    itemCount: number;
    matchedExistingId: string | null;
    matchedExistingName: string | null;
    action: 'use-existing' | 'create-new';
    slug: string;
    name: string;
  };

  let edits = $state<Edit[]>([]);
  let strategy = $state<'skip' | 'overwrite'>('skip');

  // Hydrate the edit state whenever a fresh plan arrives.
  $effect(() => {
    if (plan) {
      edits = plan.categories.map((c: ProposedCategory) => ({
        fileSlug: c.fileSlug,
        fileName: c.fileName,
        itemCount: c.itemCount,
        matchedExistingId: c.matchedExistingId,
        matchedExistingName: c.matchedExistingName,
        action: c.matchedExistingId ? 'use-existing' : 'create-new',
        slug: c.fileSlug,
        name: c.fileName
      }));
      strategy = 'skip';
    }
  });

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
  {:else if phase === 'planning'}
    <div class="mt-10 flex flex-col items-center text-center" aria-live="polite">
      <Loader2 class="h-10 w-10 animate-spin text-accent" aria-hidden="true" />
      <h2 class="mt-4 text-xl font-bold text-primary">Reading file…</h2>
      <p class="mt-2 max-w-md text-sm text-secondary">Validating against the Tierdom schema.</p>
    </div>
  {:else if phase === 'committing'}
    <div class="mt-10 flex flex-col items-center text-center" aria-live="polite">
      <Loader2 class="h-10 w-10 animate-spin text-accent" aria-hidden="true" />
      <h2 class="mt-4 text-xl font-bold text-primary">Importing…</h2>
      <p class="mt-2 max-w-md text-sm text-secondary">Writing to the database.</p>
    </div>
  {:else if phase === 'review' && plan}
    <a
      href={resolve('/admin/tools/import')}
      class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
    >
      <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
    </a>
    <h2 class="mt-2 text-xl font-bold text-primary">Review import</h2>
    {#if filename}
      <p class="mt-1 text-xs text-secondary">{filename}</p>
    {/if}
    <p class="mt-3 text-sm text-secondary">
      For each category in the file, choose whether to fold its items into an existing category or
      create a new one. Items match existing rows by slug within the chosen target.
    </p>

    <form
      method="POST"
      action="?/commit"
      use:enhance={({ action }) => {
        const isCancel = action.search === '?/cancel';
        phaseOverride = isCancel ? 'form' : 'committing';
        return async ({ update }) => {
          await update({ reset: false });
          phaseOverride = isCancel ? 'form' : 'result';
        };
      }}
      class="mt-6 space-y-4"
    >
      <input type="hidden" name="planId" value={plan.planId} />
      <input type="hidden" name="filename" value={filename ?? ''} />

      <ul class="space-y-3">
        {#each edits as edit, i (edit.fileSlug)}
          <li class="rounded-lg border border-subtle bg-elevated px-5 py-4">
            <div class="flex items-baseline justify-between gap-3">
              <p class="font-medium text-primary">{edit.fileName}</p>
              <p class="text-xs text-secondary">
                {edit.itemCount}
                {edit.itemCount === 1 ? 'item' : 'items'} · slug
                <code class="font-mono">{edit.fileSlug}</code>
              </p>
            </div>

            <input type="hidden" name="fileSlug" value={edit.fileSlug} />
            <input type="hidden" name="targetId" value={edit.matchedExistingId ?? ''} />

            <fieldset class="mt-3 space-y-2 text-sm text-secondary">
              <legend class="sr-only">Mapping for {edit.fileSlug}</legend>
              {#if edit.matchedExistingId}
                <label class="flex items-start gap-2">
                  <input
                    type="radio"
                    name={`action-${i}`}
                    value="use-existing"
                    bind:group={edits[i].action}
                    class="mt-0.5"
                  />
                  <span>
                    <span class="font-medium text-primary">Use existing</span>
                    — fold items into <em>{edit.matchedExistingName}</em>.
                  </span>
                </label>
              {/if}
              <label class="flex items-start gap-2">
                <input
                  type="radio"
                  name={`action-${i}`}
                  value="create-new"
                  bind:group={edits[i].action}
                  class="mt-0.5"
                />
                <span>
                  <span class="font-medium text-primary">Create new</span> — new category, optionally
                  override the slug or name below.
                </span>
              </label>
            </fieldset>

            <input type="hidden" name="action" value={edit.action} />

            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block text-xs">
                <span class="block font-medium text-primary">Slug</span>
                <input
                  name="newSlug"
                  bind:value={edits[i].slug}
                  readonly={edit.action !== 'create-new'}
                  class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
                />
              </label>
              <label class="block text-xs">
                <span class="block font-medium text-primary">Name</span>
                <input
                  name="newName"
                  bind:value={edits[i].name}
                  readonly={edit.action !== 'create-new'}
                  class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
                />
              </label>
            </div>
          </li>
        {/each}
      </ul>

      <fieldset class="rounded-lg border border-subtle bg-elevated px-5 py-4">
        <legend class="px-2 text-sm font-medium text-primary">Item conflict strategy</legend>
        <div class="space-y-2 text-sm text-secondary">
          <label class="flex items-start gap-2">
            <input type="radio" name="strategy" value="skip" bind:group={strategy} class="mt-0.5" />
            <span>
              <span class="font-medium text-primary">Skip</span> — leave existing items alone; only insert
              items whose slugs aren't already taken in the target category.
            </span>
          </label>
          <label class="flex items-start gap-2">
            <input
              type="radio"
              name="strategy"
              value="overwrite"
              bind:group={strategy}
              class="mt-0.5"
            />
            <span>
              <span class="font-medium text-primary">Overwrite</span> — replace existing items that share
              a slug. Destructive.
            </span>
          </label>
        </div>
      </fieldset>

      <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary">
          <Check size={14} aria-hidden="true" />
          Continue import
        </Button>
        <Button type="submit" variant="secondary" formaction="?/cancel" formnovalidate>
          Cancel
        </Button>
      </div>
    </form>
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
      action="?/plan"
      enctype="multipart/form-data"
      use:enhance={() => {
        phaseOverride = 'planning';
        return async ({ update }) => {
          await update({ reset: false });
          phaseOverride = null;
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

      <Button type="submit" variant="primary">
        <Upload size={14} aria-hidden="true" />
        Continue
      </Button>
    </form>
  {/if}
</section>
