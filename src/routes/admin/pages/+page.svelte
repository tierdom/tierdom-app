<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Pages — Admin — tierdom</title>
</svelte:head>

<section>
  <h1 class="text-xl font-bold text-primary">Pages</h1>

  <div class="mt-6 flex flex-col gap-2">
    {#each data.pages as pg (pg.slug)}
      <a
        href={resolve(`/admin/pages/${pg.slug}`)}
        class="flex items-center justify-between rounded-lg border border-subtle bg-elevated px-5 py-4 transition-colors hover:border-accent/40"
      >
        <div class="min-w-0">
          <p class="font-medium text-primary">{pg.title}</p>
          <p class="text-xs text-secondary">/{pg.slug}</p>
          <p class="mt-1 truncate text-xs text-secondary">{pg.content.slice(0, 120)}…</p>
        </div>
        <span class="text-xs text-secondary">Edit &rarr;</span>
      </a>
    {/each}
  </div>

  {#if data.pages.length === 0}
    <p class="mt-6 text-sm text-secondary">No pages yet. Seed the database to create pages.</p>
  {/if}
</section>
