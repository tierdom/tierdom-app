<script lang="ts">
  import { resolve } from '$app/paths';
  import { RotateCcw, Save } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import Timestamps from '$lib/components/admin/Timestamps.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const loader = createAdminLoader();
  const { enhance } = loader;
</script>

<svelte:head>
  <title>Edit {data.title} — Admin — tierdom</title>
</svelte:head>

<section>
  <div class="flex items-center gap-3">
    <a href={resolve('/admin/cms')} class="text-sm text-secondary hover:text-primary">&larr; CMS</a>
    <h1 class="text-xl font-bold text-primary">Edit: {data.title}</h1>
    {#if data.createdAt && data.updatedAt}
      <Timestamps createdAt={data.createdAt} updatedAt={data.updatedAt} />
    {/if}
  </div>

  {#if data.usingFallback}
    <aside
      class="mt-4 rounded border border-subtle bg-surface px-4 py-3 text-sm text-secondary"
      aria-label="Using built-in default"
    >
      <p>
        <strong class="text-primary">Using the built-in default.</strong>
        No custom {data.title.toLowerCase()} is set — the site shows the fallback content below. Start
        typing to override it.
      </p>
      <details class="mt-2">
        <summary class="cursor-pointer text-xs text-secondary hover:text-primary"
          >Show default markdown</summary
        >
        <pre
          class="mt-2 overflow-x-auto rounded border border-subtle bg-canvas p-3 text-xs text-primary">{data.fallback}</pre>
      </details>
    </aside>
  {/if}

  <form method="POST" action="?/update" use:enhance class="mt-6 flex flex-col gap-4">
    <MarkdownField value={data.value} required />
    <div class="flex items-center gap-3">
      <Button type="submit"><Save size={16} />Save</Button>
      {#if !data.usingFallback}
        <Button
          type="submit"
          variant="danger-ghost"
          formaction="?/reset"
          formnovalidate
          onclick={(e: Event) => {
            if (!confirm(`Reset ${data.title} to the built-in default?`)) e.preventDefault();
          }}
        >
          <RotateCcw size={16} />Reset to default
        </Button>
      {/if}
    </div>
  </form>
</section>

<AdminOverlay loading={loader.loading} />
