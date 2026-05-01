<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatRelativeDate } from '$lib/format-date';
  import { resolve } from '$app/paths';
  import { Plus } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import AdminWarning from '$lib/components/admin/AdminWarning.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type DashboardItem = { path: string; label: string; detail: string };

  let staleTrashTotal = $derived(data.staleTrash.categories + data.staleTrash.items);
</script>

{#snippet dashboardCard(
  path: string,
  count: number,
  title: string,
  items: DashboardItem[],
  extras?: Snippet,
)}
  <div>
    <a
      href={resolve(path as '/admin')}
      class="block rounded-lg border border-subtle bg-elevated px-4 py-3 transition-colors hover:border-accent/40"
    >
      <p class="text-2xl font-bold text-primary">{count}</p>
      <p class="text-xs text-secondary">{title}</p>
    </a>
    <ul class="mt-3 flex flex-col gap-1">
      {#each items as item (item.path)}
        <li>
          <a
            href={resolve(item.path as '/admin')}
            class="flex items-center justify-between rounded border border-subtle bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40"
          >
            <span class="text-primary">{item.label}</span>
            <span class="text-xs text-secondary">{item.detail}</span>
          </a>
        </li>
      {/each}
      {#if items.length === 0}
        <li class="px-3 py-2 text-xs text-secondary">No items yet</li>
      {/if}
    </ul>
    {#if extras}
      {@render extras()}
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>Admin — tierdom</title>
</svelte:head>

<section>
  <h1 class="text-xl font-bold text-primary">Dashboard</h1>

  {#if staleTrashTotal > 0}
    <div class="mt-4">
      <AdminWarning href={resolve('/admin/trash')} cta="Open Trash">
        {staleTrashTotal}
        {staleTrashTotal === 1 ? 'item' : 'items'} have been in Trash for {data.staleTrashDays}+
        days. Consider permanently deleting them to keep your data tidy.
      </AdminWarning>
    </div>
  {/if}

  <div class="mt-6 grid gap-6 lg:grid-cols-3">
    {@render dashboardCard(
      '/admin/cms',
      data.counts.pages,
      'CMS',
      data.pages.map((pg) => ({
        path: `/admin/cms/pages/${pg.slug}`,
        label: pg.title,
        detail: `/${pg.slug} \u00B7 ${formatRelativeDate(pg.updatedAt)}`,
      })),
      cmsExtras,
    )}

    {@render dashboardCard(
      '/admin/categories',
      data.counts.categories,
      'Categories',
      data.categories.map((cat) => ({
        path: `/admin/categories/${cat.id}`,
        label: cat.name,
        detail: `${cat.itemCount} items \u00B7 ${formatRelativeDate(cat.updatedAt)}`,
      })),
    )}

    {@render dashboardCard(
      '/admin/items',
      data.counts.items,
      'Items',
      data.recentItems.map((item) => ({
        path: `/admin/items/${item.id}`,
        label: item.name,
        detail: `${item.categoryName} \u00B7 ${formatRelativeDate(item.updatedAt)}`,
      })),
      itemsExtras,
    )}
  </div>
</section>

{#snippet cmsExtras()}
  <hr class="my-3 border-subtle" />
  <ul class="mt-2 flex flex-col gap-1">
    {#each data.siteContent as block (block.key)}
      <li>
        <a
          href={resolve(`/admin/cms/general/${block.key}`)}
          class="flex items-center justify-between rounded border border-subtle bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40"
        >
          <span class="text-primary">{block.title}</span>
          <span class="text-xs text-secondary"
            >/{block.key}{block.updatedAt
              ? ` \u00B7 ${formatRelativeDate(block.updatedAt)}`
              : ''}</span
          >
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet itemsExtras()}
  <div class="mt-2 flex justify-end">
    <Button href={resolve('/admin/items/new-item')} compact>
      <Plus size={12} />New item
    </Button>
  </div>
{/snippet}
