<script lang="ts">
  import { resolve } from '$app/paths';
  import { ArrowLeft, Construction, ExternalLink } from 'lucide-svelte';

  type StubInfo = { sampleNeeded: boolean; issueUrl: string };
  type Props = {
    label: string;
    description: string;
    stubInfo?: StubInfo;
  };

  let { label, description, stubInfo }: Props = $props();
</script>

<a
  href={resolve('/admin/tools/import')}
  class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
>
  <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
</a>
<h2 class="mt-2 text-xl font-bold text-primary">{label}</h2>
<p class="mt-1 text-sm text-secondary">{description}</p>

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
      <a class="text-accent underline" href={resolve('/admin/tools/import/json')}>Tierdom JSON</a>
      importer.
    </p>
    {#if stubInfo}
      <p class="mt-3">
        <a
          href={stubInfo.issueUrl}
          target="_blank"
          rel="noreferrer noopener external"
          class="inline-flex items-center gap-1 text-accent hover:underline"
        >
          {#if stubInfo.sampleNeeded}Open an issue with a sample export{:else}Suggest a new format
          {/if}
          <ExternalLink class="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    {/if}
  </div>
</div>
