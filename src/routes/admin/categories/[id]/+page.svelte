<script lang="ts">
  import { formatRelativeDate } from '$lib/format-date';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { ArrowDown, Save, X, Trash2, Plus } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import FormField from '$lib/components/admin/FormField.svelte';
  import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
  import PropKeyEditor from '$lib/components/admin/PropKeyEditor.svelte';
  import TierCutoffsInput from '$lib/components/admin/TierCutoffsInput.svelte';
  import SortableList from '$lib/components/admin/SortableList.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import Timestamps from '$lib/components/admin/Timestamps.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import { scoreToTier } from '$lib/tier';
  import TierBadge from '$lib/components/admin/TierBadge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const loader = createAdminLoader();
  const { enhance } = loader;

  let pendingDiscard = $state(false);
  let pendingSort = $state(false);
  let pendingDeleteCategory = $state(false);
  let pendingDeleteItem: { id: string; name: string } | null = $state(null);

  let dirty = $state(false);
  let userWantsCutoffs = $state(false);
  const hasCutoffs = $derived(
    data.category.cutoffS != null ||
      data.category.cutoffA != null ||
      data.category.cutoffB != null ||
      data.category.cutoffC != null ||
      data.category.cutoffD != null ||
      data.category.cutoffE != null ||
      data.category.cutoffF != null
  );
  const showCutoffs = $derived(userWantsCutoffs || hasCutoffs);

  const cutoffs = $derived({
    S: data.category.cutoffS,
    A: data.category.cutoffA,
    B: data.category.cutoffB,
    C: data.category.cutoffC,
    D: data.category.cutoffD,
    E: data.category.cutoffE,
    F: data.category.cutoffF
  });

  function markDirty() {
    dirty = true;
  }

  function cancel() {
    if (dirty) {
      pendingDiscard = true;
      return;
    }
    goto(resolve('/admin/categories'));
  }

  const handleReorderItems = loader.withLoading(async (orderedIds: string[]) => {
    const body = new FormData();
    body.set('order', JSON.stringify(orderedIds));
    await fetch('?/reorderItems', { method: 'POST', body });
  });

  const performSortByScore = loader.withLoading(async () => {
    await fetch('?/sortByScore', { method: 'POST', body: new FormData() });
    location.reload();
  });

  const performDeleteCategory = loader.withLoading(async () => {
    await fetch('?/delete', { method: 'POST', body: new FormData() });
    await goto(resolve('/admin/categories'));
  });

  const performDeleteItem = loader.withLoading(async (id: string) => {
    const body = new FormData();
    body.set('id', id);
    await fetch('?/deleteItem', { method: 'POST', body });
    await invalidateAll();
  });
</script>

<svelte:head>
  <title>{data.category.name} — Admin — tierdom</title>
</svelte:head>

<section>
  <AdminOverlay loading={loader.loading} />
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <a href={resolve('/admin/categories')} class="text-sm text-secondary hover:text-primary"
      >&larr; Back</a
    >
    <h1 class="text-xl font-bold text-primary">{data.category.name}</h1>
    <Timestamps createdAt={data.category.createdAt} updatedAt={data.category.updatedAt} />
  </div>

  <form
    id="edit-category"
    method="POST"
    action="?/update"
    use:enhance
    oninput={markDirty}
    class="mt-6 flex flex-col gap-3"
  >
    <FormField label="Name" name="name" value={data.category.name} required />
    <FormField label="Slug" name="slug" value={data.category.slug} />
    <MarkdownField label="Description" name="description" value={data.category.description} />
    <PropKeyEditor propKeys={data.category.propKeys} onchange={markDirty} />

    {#if showCutoffs}
      <h2 class="mt-2 text-sm font-semibold text-secondary">Tier cutoffs</h2>
      <p class="text-xs text-secondary/70">
        Minimum score to reach each tier. Leave empty for defaults (S=90, A=80, B=70, C=55, D=40,
        E=20, F=0).
      </p>
      <TierCutoffsInput values={cutoffs} />
    {:else}
      <button
        type="button"
        class="mt-1 cursor-pointer self-start text-xs text-secondary hover:text-primary"
        onclick={() => (userWantsCutoffs = true)}
      >
        Customize tier cutoffs…
      </button>
    {/if}
  </form>

  <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
    <Button type="submit" form="edit-category"><Save size={16} />Save</Button>
    <Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
    <Button variant="danger" type="button" onclick={() => (pendingDeleteCategory = true)}>
      <Trash2 size={16} />Delete
    </Button>
  </div>

  <div class="mt-10 flex items-center gap-3">
    <h2 class="text-lg font-bold text-primary">Items ({data.items.length})</h2>
    {#if data.items.length > 1}
      <Button variant="secondary" compact onclick={() => (pendingSort = true)}>Sort by score</Button
      >
    {/if}
    <Button
      variant="secondary"
      compact
      href={resolve(`/admin/items/new-item?category=${data.category.id}&returnTo=categories`)}
    >
      <Plus size={12} />New item
    </Button>
  </div>

  {#if data.items.length > 0}
    <div class="mt-4 w-full text-sm">
      <div class="flex border-b border-subtle pb-2 text-left text-xs text-secondary">
        <div class="flex w-6 shrink-0 items-center justify-center"><ArrowDown size={10} /></div>
        <div class="w-8 font-medium">Tier</div>
        <div class="flex-1 font-medium">Name</div>
        <div class="w-16 font-medium">Score</div>
        <div class="hidden w-24 font-medium md:block">Updated</div>
        <div class="w-24 text-right font-medium">Actions</div>
      </div>

      <SortableList items={data.items} onreorder={handleReorderItems}>
        {#snippet row(item)}
          {@const tier = scoreToTier(item.score as number, cutoffs)}
          {@const itemProps = (item.props ?? []) as { key: string; value: string }[]}
          <div class="flex flex-1 items-center py-2">
            <div class="w-8 shrink-0">
              <TierBadge {tier} />
            </div>
            <div class="min-w-0 flex-1 text-primary">
              <div class="flex items-center gap-1.5">
                <a
                  href={resolve(`/admin/items/${item.id}?returnTo=categories`)}
                  class="shrink-0 text-accent hover:underline"
                >
                  {item.name}
                </a>
                {#if itemProps.length > 0}
                  <div class="hidden gap-1 lg:flex">
                    {#each itemProps as prop (prop.key)}
                      <span class="rounded-full bg-subtle/30 px-1.5 text-[0.65rem] text-secondary"
                        >{prop.key}: {prop.value}</span
                      >
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <div class="w-16 text-secondary">{item.score}</div>
            <div class="hidden w-24 text-xs text-secondary md:block">
              {formatRelativeDate(item.updatedAt as string)}
            </div>
            <div class="w-24 text-right">
              <Button
                variant="danger-ghost"
                compact
                type="button"
                onclick={() =>
                  (pendingDeleteItem = { id: item.id as string, name: String(item.name) })}
              >
                <Trash2 size={12} />delete
              </Button>
            </div>
          </div>
        {/snippet}
      </SortableList>
    </div>
  {:else}
    <p class="mt-4 text-sm text-secondary">No items yet.</p>
  {/if}

  <div class="mt-6">
    <Button
      href={resolve(`/admin/items/new-item?category=${data.category.id}&returnTo=categories`)}
    >
      <Plus size={16} />New item
    </Button>
  </div>
</section>

<ConfirmDialog
  open={pendingDiscard}
  title="Discard unsaved changes?"
  message="You have unsaved changes. Discard them and leave this page?"
  confirmLabel="Discard"
  variant="danger"
  oncancel={() => (pendingDiscard = false)}
  onconfirm={async () => {
    pendingDiscard = false;
    await goto(resolve('/admin/categories'));
  }}
/>

<ConfirmDialog
  open={pendingSort}
  title="Sort by score?"
  message="Sort all items by score (highest first)? This replaces the current order."
  confirmLabel="Sort"
  variant="primary"
  oncancel={() => (pendingSort = false)}
  onconfirm={async () => {
    pendingSort = false;
    await performSortByScore();
  }}
/>

<ConfirmDialog
  open={pendingDeleteCategory}
  title="Delete category?"
  message={`Delete "${data.category.name}" and all its items? This cannot be undone.`}
  confirmLabel="Delete category"
  requireTypedConfirmation={data.category.slug}
  oncancel={() => (pendingDeleteCategory = false)}
  onconfirm={async () => {
    pendingDeleteCategory = false;
    await performDeleteCategory();
  }}
/>

<ConfirmDialog
  open={pendingDeleteItem !== null}
  title="Delete item?"
  message={pendingDeleteItem ? `Delete "${pendingDeleteItem.name}"?` : ''}
  confirmLabel="Delete item"
  oncancel={() => (pendingDeleteItem = null)}
  onconfirm={async () => {
    const target = pendingDeleteItem;
    pendingDeleteItem = null;
    if (target) await performDeleteItem(target.id);
  }}
/>
