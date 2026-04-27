<script lang="ts">
  import { resolve } from '$app/paths';
  import { enhance } from '$app/forms';
  import { ArrowLeft, Check } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ImportPlan, ProposedCategory } from '$lib/server/import/types';
  import type { ImportPhase } from './phase';

  type ExistingCategory = { id: string; slug: string; name: string };

  type Props = {
    plan: ImportPlan;
    filename: string | null;
    existingCategories: ExistingCategory[];
    setPhase: (phase: ImportPhase | null) => void;
  };

  let { plan, filename, existingCategories, setPhase }: Props = $props();

  type Edit = {
    fileSlug: string;
    fileName: string;
    itemCount: number;
    matchedExistingId: string | null;
    matchedExistingName: string | null;
    action: 'skip' | 'use-existing' | 'create-new';
    existingId: string;
    newSlug: string;
    newName: string;
  };

  const canUseExisting = $derived(existingCategories.length > 0);

  let edits = $state<Edit[]>([]);
  let strategy = $state<'skip' | 'overwrite'>('skip');

  // Hydrate the edit state whenever a fresh plan arrives.
  $effect(() => {
    edits = plan.categories.map((c: ProposedCategory) => ({
      fileSlug: c.fileSlug,
      fileName: c.fileName,
      itemCount: c.itemCount,
      matchedExistingId: c.matchedExistingId,
      matchedExistingName: c.matchedExistingName,
      action: c.matchedExistingId ? 'use-existing' : 'create-new',
      existingId: c.matchedExistingId ?? existingCategories[0]?.id ?? '',
      newSlug: c.fileSlug,
      newName: c.fileName
    }));
    strategy = 'skip';
  });

  function existingNameFor(id: string): string {
    return existingCategories.find((c) => c.id === id)?.name ?? '';
  }
</script>

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
    setPhase(isCancel ? 'form' : 'committing');
    return async ({ update }) => {
      await update({ reset: false });
      setPhase(isCancel ? 'form' : 'result');
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
        <input type="hidden" name="action" value={edit.action} />
        <input
          type="hidden"
          name="targetId"
          value={edit.action === 'use-existing' ? edit.existingId : ''}
        />
        <input
          type="hidden"
          name="newSlug"
          value={edit.action === 'create-new' ? edit.newSlug : edit.fileSlug}
        />
        <input
          type="hidden"
          name="newName"
          value={edit.action === 'create-new' ? edit.newName : edit.fileName}
        />

        <fieldset class="mt-3 space-y-2 text-sm text-secondary">
          <legend class="sr-only">Mapping for {edit.fileSlug}</legend>
          <label class="flex items-start gap-2">
            <input
              type="radio"
              name={`action-${i}`}
              value="skip"
              bind:group={edits[i].action}
              class="mt-0.5"
            />
            <span>
              <span class="font-medium text-primary">Don't import</span> — skip this category and all
              its items.
            </span>
          </label>
          {#if canUseExisting}
            <label class="flex items-start gap-2">
              <input
                type="radio"
                name={`action-${i}`}
                value="use-existing"
                bind:group={edits[i].action}
                class="mt-0.5"
              />
              <span>
                <span class="font-medium text-primary">Use existing category</span> — fold items
                into a category that already exists.
                {#if edit.matchedExistingName}
                  <span class="text-xs">
                    Slug match: <em>{edit.matchedExistingName}</em>.
                  </span>
                {/if}
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
              <span class="font-medium text-primary">Create new category</span> — new category, optionally
              override the slug or name below.
            </span>
          </label>
        </fieldset>

        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-xs">
            <span class="block font-medium text-primary">Slug</span>
            {#if edit.action === 'skip'}
              <input
                value=""
                disabled
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              />
            {:else if edit.action === 'use-existing'}
              <select
                bind:value={edits[i].existingId}
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              >
                {#each existingCategories as cat (cat.id)}
                  <option value={cat.id}>{cat.slug}</option>
                {/each}
              </select>
            {:else}
              <input
                bind:value={edits[i].newSlug}
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              />
            {/if}
          </label>
          <label class="block text-xs">
            <span class="block font-medium text-primary">Name</span>
            {#if edit.action === 'skip'}
              <input
                value=""
                disabled
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              />
            {:else if edit.action === 'use-existing'}
              <input
                value={existingNameFor(edit.existingId)}
                readonly
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              />
            {:else}
              <input
                bind:value={edits[i].newName}
                class="mt-1 block w-full rounded-md border border-subtle bg-canvas px-2 py-1.5 text-sm text-primary"
              />
            {/if}
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
    <Button type="submit" variant="secondary" formaction="?/cancel" formnovalidate>Cancel</Button>
  </div>
</form>
