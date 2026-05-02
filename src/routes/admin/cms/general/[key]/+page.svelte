<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { RotateCcw, Save } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import Timestamps from '$lib/components/admin/Timestamps.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const loader = createAdminLoader();
  const { enhance } = loader;

  let currentValue = $derived<string>(form?.value ?? data.value);
  let byteLength = $derived(new TextEncoder().encode(currentValue).length);
  let overLimit = $derived(byteLength > data.maxBytes);

  let pendingReset = $state(false);

  const performReset = loader.withLoading(async () => {
    await fetch('?/reset', { method: 'POST', body: new FormData() });
    await goto(resolve('/admin/cms'));
  });
</script>

<svelte:head>
  <title>Edit {data.title} — Admin — tierdom</title>
</svelte:head>

<section>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
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

  <form
    method="POST"
    action="?/update"
    use:enhance
    class="mt-6 flex flex-col gap-4"
    oninput={(e) => {
      const t = e.target as HTMLElement;
      if (t?.id === 'content') currentValue = (t as HTMLTextAreaElement).value;
    }}
  >
    <MarkdownField value={form?.value ?? data.value} required />
    <div class="flex items-center justify-between text-xs">
      <span class:text-red-400={overLimit} class:text-secondary={!overLimit}>
        {byteLength.toLocaleString()} / {data.maxBytes.toLocaleString()} bytes
      </span>
      {#if form?.error}
        <span class="text-red-400" role="alert">{form.error}</span>
      {/if}
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button type="submit" disabled={overLimit}><Save size={16} />Save</Button>
      {#if !data.usingFallback}
        <Button type="button" variant="danger-ghost" onclick={() => (pendingReset = true)}>
          <RotateCcw size={16} />Reset to default
        </Button>
      {/if}
    </div>
  </form>
</section>

<AdminOverlay loading={loader.loading} />

<ConfirmDialog
  open={pendingReset}
  title="Reset to default?"
  message={`Reset ${data.title} to the built-in default? Your customizations will be lost.`}
  confirmLabel="Reset"
  variant="danger"
  oncancel={() => (pendingReset = false)}
  onconfirm={async () => {
    pendingReset = false;
    await performReset();
  }}
/>
