<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatRelativeDate } from '$lib/format-date';
  import { resolve } from '$app/paths';
  import { Plus } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type DashboardItem = { path: string; label: string; detail: string };
</script>

{#snippet dashboardCard(
  path: string,
  count: number,
  title: string,
  items: DashboardItem[],
  footer: Snippet
)}
  <div>
    <a
      href={resolve(path)}
      class="block rounded-lg border border-subtle bg-elevated px-4 py-3 transition-colors hover:border-accent/40"
    >
      <p class="text-2xl font-bold text-primary">{count}</p>
      <p class="text-xs text-secondary">{title}</p>
    </a>
    <ul class="mt-3 flex flex-col gap-1">
      {#each items as item (item.path)}
        <li>
          <a
            href={resolve(item.path)}
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
    <div class="mt-2 px-1">
      {@render footer()}
    </div>
  </div>
{/snippet}

<svelte:head>
  <title>Admin — tierdom</title>
</svelte:head>

<section>
  <h1 class="text-xl font-bold text-primary">Dashboard</h1>

  <div class="mt-6 grid gap-6 lg:grid-cols-3">
    {@render dashboardCard(
      '/admin/pages',
      data.counts.pages,
      'Pages',
      data.pages.map((pg) => ({
        path: `/admin/pages/${pg.slug}`,
        label: pg.title,
        detail: `/${pg.slug} \u00B7 ${formatRelativeDate(pg.updatedAt)}`
      })),
      footerAllPages
    )}

    {@render dashboardCard(
      '/admin/categories',
      data.counts.categories,
      'Categories',
      data.categories.map((cat) => ({
        path: `/admin/categories/${cat.id}`,
        label: cat.name,
        detail: `${cat.itemCount} items \u00B7 ${formatRelativeDate(cat.updatedAt)}`
      })),
      footerAllCategories
    )}

    {@render dashboardCard(
      '/admin/items',
      data.counts.items,
      'Items',
      data.recentItems.map((item) => ({
        path: `/admin/items/${item.id}`,
        label: item.name,
        detail: `${item.categoryName} \u00B7 ${formatRelativeDate(item.updatedAt)}`
      })),
      footerItems
    )}
  </div>
</section>

{#snippet footerAllPages()}
  <p class="text-xs text-secondary/50">All pages</p>
{/snippet}

{#snippet footerAllCategories()}
  <p class="text-xs text-secondary/50">All categories</p>
{/snippet}

{#snippet footerItems()}
  <div class="flex items-center justify-between">
    <p class="text-xs text-secondary/50">Recently updated</p>
    <a
      href={resolve('/admin/items/new-item')}
      class="inline-flex items-center gap-1 text-xs text-accent hover:underline"
    >
      <Plus size={12} />New item
    </a>
  </div>
{/snippet}
