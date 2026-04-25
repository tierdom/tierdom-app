<script lang="ts">
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { Plus, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import SortableList from '$lib/components/admin/SortableList.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const loader = createAdminLoader();

  let pendingDelete: { id: string; name: string; slug: string } | null = $state(null);

  const handleReorder = loader.withLoading(async (orderedIds: string[]) => {
    const body = new FormData();
    body.set('order', JSON.stringify(orderedIds));
    await fetch('?/reorder', { method: 'POST', body });
  });

  const performDelete = loader.withLoading(async (id: string) => {
    const body = new FormData();
    body.set('id', id);
    await fetch('?/delete', { method: 'POST', body });
    await invalidateAll();
  });
</script>

<svelte:head>
  <title>Categories — Admin — tierdom</title>
</svelte:head>

<section>
  <AdminOverlay loading={loader.loading} />
  <h1 class="text-xl font-bold text-primary">Categories</h1>

  {#if data.categories.length > 0}
    <div class="mt-6 w-full text-sm">
      <div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
        <div class="w-8"></div>
        <div class="flex-1 font-medium">Name</div>
        <div class="flex-1 font-medium">Slug</div>
        <div class="w-16 font-medium">Items</div>
        <div class="w-24 text-right font-medium">Actions</div>
      </div>

      <SortableList items={data.categories} onreorder={handleReorder}>
        {#snippet row(cat)}
          <div class="flex flex-1 items-center py-2">
            <div class="flex-1 text-primary">
              <a href={resolve(`/admin/categories/${cat.id}`)} class="text-accent hover:underline">
                {cat.name}
              </a>
            </div>
            <div class="flex-1 text-secondary">{cat.slug}</div>
            <div class="w-16 text-secondary">{cat.itemCount}</div>
            <div class="w-24 text-right">
              <Button
                variant="danger-ghost"
                compact
                type="button"
                onclick={() =>
                  (pendingDelete = {
                    id: cat.id,
                    name: String(cat.name),
                    slug: String(cat.slug)
                  })}
              >
                <Trash2 size={12} />delete
              </Button>
            </div>
          </div>
        {/snippet}
      </SortableList>
    </div>
  {:else}
    <p class="mt-6 text-sm text-secondary">No categories yet.</p>
  {/if}

  <div class="mt-8">
    <Button href={resolve('/admin/categories/create')}><Plus size={16} />New category</Button>
  </div>
</section>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Delete category?"
  message={pendingDelete
    ? `Delete "${pendingDelete.name}" and all its items? This cannot be undone.`
    : ''}
  confirmLabel="Delete category"
  requireTypedConfirmation={pendingDelete?.slug}
  oncancel={() => (pendingDelete = null)}
  onconfirm={async () => {
    const target = pendingDelete;
    pendingDelete = null;
    if (target) await performDelete(target.id);
  }}
/>
