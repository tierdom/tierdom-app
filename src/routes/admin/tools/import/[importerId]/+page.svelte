<script lang="ts">
  import { resolve } from '$app/paths';
  import { ArrowLeft, ExternalLink, Construction } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const importer = $derived(data.importer);
</script>

<svelte:head>
  <title>{importer.label} import — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">{importer.label} import</h1>

<section>
  <a
    href={resolve('/admin/tools/import')}
    class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
  >
    <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
  </a>

  <h2 class="mt-2 text-xl font-bold text-primary">{importer.label}</h2>
  <p class="mt-1 text-sm text-secondary">{importer.description}</p>

  {#if importer.status === 'stub'}
    <div class="mt-6 flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4">
      <Construction class="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <div class="min-w-0 text-sm text-secondary">
        <p class="font-medium text-primary">Coming soon</p>
        <p class="mt-1">
          This importer isn't built yet. In the meantime you can wrangle your data into the
          <a class="text-accent hover:underline" href={resolve('/schemas/tierdom-import-v1.json')}
            >Tierdom JSON Schema</a
          >
          and use the
          <a class="text-accent hover:underline" href={resolve('/admin/tools/import/json')}
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
  {:else}
    <p class="mt-6 text-sm text-secondary">
      Upload form lands in the next milestone. The plumbing is in place; this page will host the
      form.
    </p>
  {/if}
</section>
