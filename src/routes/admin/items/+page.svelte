<script lang="ts">
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { formatRelativeDate } from '$lib/format-date';
  import { ArrowDown, Plus, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import TierBadge from '$lib/components/admin/TierBadge.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import { scoreToTier } from '$lib/tier';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const loader = createAdminLoader();

  let search = $state('');
  let pendingDelete: { id: string; name: string } | null = $state(null);

  const performDelete = loader.withLoading(async (id: string) => {
    const body = new FormData();
    body.set('id', id);
    await fetch('?/delete', { method: 'POST', body });
    await invalidateAll();
  });

  let filtered = $derived(() => {
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  });
</script>

<svelte:head>
  <title>Items (all) — Admin — tierdom</title>
</svelte:head>

<section>
  <AdminOverlay loading={loader.loading} />

  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-primary">Items ({data.items.length})</h1>
    <a
      href={resolve('/admin/items/new-item')}
      class="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-80"
    >
      <Plus size={16} />New item
    </a>
  </div>

  <input
    type="text"
    placeholder="Quick search by name, slug, or category…"
    aria-label="Quick search by name, slug, or category"
    bind:value={search}
    class="mt-4 w-full rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
  />

  {#if filtered().length > 0}
    <table class="mt-4 w-full text-sm">
      <thead>
        <tr class="border-b border-subtle text-left text-xs text-secondary">
          <th scope="col" class="w-8 pb-2 font-medium">Tier</th>
          <th scope="col" class="pb-2 font-medium">Name</th>
          <th scope="col" class="hidden w-40 pb-2 font-medium sm:table-cell">Category</th>
          <th scope="col" class="hidden w-14 pb-2 font-medium sm:table-cell">Score</th>
          <th scope="col" class="hidden w-24 pb-2 font-medium md:table-cell">
            <span class="inline-flex items-center gap-0.5">Updated <ArrowDown size={10} /></span>
          </th>
          <th scope="col" class="hidden w-20 pb-2 text-right font-medium sm:table-cell">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered() as item (item.id)}
          {@const tier = scoreToTier(item.score, {
            S: item.cutoffS,
            A: item.cutoffA,
            B: item.cutoffB,
            C: item.cutoffC,
            D: item.cutoffD,
            E: item.cutoffE,
            F: item.cutoffF,
          })}
          <tr class="border-b border-subtle/30">
            <td class="py-2">
              <TierBadge {tier} />
            </td>
            <td class="py-2 text-primary">
              <div class="flex items-center gap-1.5">
                <a
                  href={resolve(`/admin/items/${item.id}`)}
                  class="shrink-0 text-accent hover:underline"
                >
                  {item.name}
                </a>
                {#if item.props.length > 0}
                  <div class="hidden gap-1 lg:flex">
                    {#each item.props as prop (prop.key)}
                      <span class="rounded-full bg-subtle/30 px-1.5 text-[0.65rem] text-secondary"
                        >{prop.key}: {prop.value}</span
                      >
                    {/each}
                  </div>
                {/if}
              </div>
            </td>
            <td class="hidden w-40 truncate py-2 text-xs text-secondary sm:table-cell">
              {item.categoryName}
            </td>
            <td class="hidden py-2 text-secondary sm:table-cell">{item.score}</td>
            <td class="hidden py-2 text-xs text-secondary md:table-cell">
              {formatRelativeDate(item.updatedAt)}
            </td>
            <td class="hidden py-2 text-right sm:table-cell">
              <Button
                variant="danger-ghost"
                compact
                type="button"
                onclick={() => (pendingDelete = { id: item.id, name: item.name })}
              >
                <Trash2 size={12} />trash
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if search.trim()}
    <p class="mt-6 text-sm text-secondary">No items matching "{search}".</p>
  {:else}
    <p class="mt-6 text-sm text-secondary">No items yet.</p>
  {/if}
</section>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Move item to Trash?"
  message={pendingDelete ? `Move "${pendingDelete.name}" to Trash. You can restore it later.` : ''}
  confirmLabel="Move to Trash"
  oncancel={() => (pendingDelete = null)}
  onconfirm={async () => {
    const target = pendingDelete;
    pendingDelete = null;
    if (target) await performDelete(target.id);
  }}
/>
