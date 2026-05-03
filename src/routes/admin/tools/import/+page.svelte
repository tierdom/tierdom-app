<script lang="ts">
  import { resolve } from '$app/paths';
  import { Download, FileJson, BookOpen, Dice5, Film, Gauge, Sparkles } from 'lucide-svelte';
  import type { PageData } from './$types';
  import type { ImporterSummary } from '$lib/server/import/types';

  let { data }: { data: PageData } = $props();

  const icons: Record<string, typeof FileJson> = {
    json: FileJson,
    imdb: Film,
    tmdb: Film,
    'rotten-tomatoes': Film,
    goodreads: BookOpen,
    storygraph: BookOpen,
    bgg: Dice5,
    metacritic: Gauge,
  };

  function iconFor(importer: ImporterSummary) {
    return icons[importer.id] ?? Download;
  }

  const tierdomImporters = $derived(data.importers.filter((i) => i.id === 'json'));
  const thirdPartyImporters = $derived(data.importers.filter((i) => i.id !== 'json'));

  const suggestUrl = 'https://github.com/tierdom/tierdom-app/issues?q=is%3Aissue%20import';
</script>

<svelte:head>
  <title>Import — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">Import</h1>

<div class="space-y-8">
  <section>
    <h2 class="text-xl font-bold text-primary">Import</h2>
    <p class="mt-1 text-sm text-secondary">
      Bring data into Tierdom. Pick a source below. The Tierdom JSON format is the canonical on-ramp
      — its <a class="text-accent underline" href={resolve('/schemas/tierdom-import-v1.json')}
        >JSON Schema</a
      > is published so you can wrangle data from any system into it.
    </p>
  </section>

  <section>
    <h3 class="text-sm font-semibold tracking-wide text-secondary uppercase">Tierdom Import</h3>
    <ul class="mt-3 space-y-3">
      {#each tierdomImporters as importer (importer.id)}
        {@const Icon = iconFor(importer)}
        {@const available = importer.status === 'available'}
        <li>
          <a
            href={resolve(`/admin/tools/import/${importer.id}`)}
            class="flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4 transition-colors hover:border-accent/40"
          >
            <Icon
              class="mt-1 h-5 w-5 shrink-0 {available ? 'text-accent' : 'text-secondary'}"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="flex items-center gap-2 font-medium text-primary">
                <span>{importer.label}</span>
                {#if !available}
                  <span
                    class="rounded-full border border-subtle px-2 py-0.5 text-[10px] tracking-wide text-secondary uppercase"
                    >Coming soon</span
                  >
                {/if}
              </p>
              <p class="mt-1 text-xs text-secondary">{importer.description}</p>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <h3 class="text-sm font-semibold tracking-wide text-secondary uppercase">Third-Party Import</h3>
    <ul class="mt-3 space-y-3">
      {#each thirdPartyImporters as importer (importer.id)}
        {@const Icon = iconFor(importer)}
        {@const available = importer.status === 'available'}
        <li>
          <a
            href={resolve(`/admin/tools/import/${importer.id}`)}
            class="flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4 transition-colors hover:border-accent/40"
          >
            <Icon
              class="mt-1 h-5 w-5 shrink-0 {available ? 'text-accent' : 'text-secondary'}"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="flex items-center gap-2 font-medium text-primary">
                <span>{importer.label}</span>
                {#if !available}
                  <span
                    class="rounded-full border border-subtle px-2 py-0.5 text-[10px] tracking-wide text-secondary uppercase"
                    >Coming soon</span
                  >
                {/if}
              </p>
              <p class="mt-1 text-xs text-secondary">{importer.description}</p>
            </div>
          </a>
        </li>
      {/each}
      <li>
        <a
          href={suggestUrl}
          target="_blank"
          rel="noreferrer noopener external"
          class="flex items-start gap-4 rounded-lg border border-dashed border-subtle bg-canvas px-5 py-4 transition-colors hover:border-accent/40"
        >
          <Sparkles class="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div class="min-w-0">
            <p class="font-medium text-primary">Suggest a new format</p>
            <p class="mt-1 text-xs text-secondary">
              Want a built-in importer for another system? Open or upvote an issue on the project
              site.
            </p>
          </div>
        </a>
      </li>
    </ul>
  </section>
</div>
