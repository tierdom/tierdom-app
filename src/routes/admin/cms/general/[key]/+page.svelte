<script lang="ts">
  import { resolve } from '$app/paths';
  import { Save } from 'lucide-svelte';
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

  <form method="POST" action="?/update" use:enhance class="mt-6 flex flex-col gap-4">
    <MarkdownField value={data.value} required />
    <div>
      <Button type="submit"><Save size={16} />Save</Button>
    </div>
  </form>
</section>

<AdminOverlay loading={loader.loading} />
