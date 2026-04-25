<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { deserialize } from '$app/forms';
  import { RotateCcw, Trash2 } from 'lucide-svelte';
  import { formatRelativeDate } from '$lib/format-date';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const loader = createAdminLoader();

  // Trash actions are the first place we surface server-side action errors
  // (slug conflicts on restore). No toast system in the codebase yet — render
  // the message in a banner above the lists.
  let actionError: string | null = $state(null);

  type Pending =
    | { kind: 'restore-category'; id: string; name: string }
    | { kind: 'restore-item'; id: string; name: string }
    | { kind: 'purge-category'; id: string; name: string; slug: string }
    | { kind: 'purge-item'; id: string; name: string; slug: string };
  let pending: Pending | null = $state(null);

  async function callAction(action: string, id: string): Promise<string | null> {
    const body = new FormData();
    body.set('id', id);
    const res = await fetch(action, {
      method: 'POST',
      headers: { 'x-sveltekit-action': 'true' },
      body
    });
    const result = deserialize(await res.text());
    if (result.type === 'failure') {
      const errorMsg = (result.data as { error?: string } | undefined)?.error;
      return errorMsg ?? 'Action failed';
    }
    return null;
  }

  const performAction = loader.withLoading(async (action: string, id: string) => {
    actionError = null;
    const err = await callAction(action, id);
    if (err) {
      actionError = err;
      return;
    }
    await invalidateAll();
  });

  function deletedAtDisplay(deletedAt: string): string {
    return formatRelativeDate(deletedAt);
  }
</script>

<svelte:head>
  <title>Trash — Admin — tierdom</title>
</svelte:head>

<section>
  <AdminOverlay loading={loader.loading} />

  <h1 class="text-xl font-bold text-primary">Trash</h1>
  <p class="mt-2 text-sm text-secondary">
    Items and categories you moved to Trash. Restore brings them back as they were. Delete forever
    removes them and any associated images permanently.
  </p>

  {#if actionError}
    <div
      role="alert"
      class="mt-4 rounded border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400"
    >
      {actionError}
    </div>
  {/if}

  <h2 class="mt-8 text-base font-semibold text-primary">Categories</h2>
  {#if data.categories.length > 0}
    <table class="mt-3 w-full text-sm">
      <thead>
        <tr class="border-b border-subtle text-left text-xs text-secondary">
          <th scope="col" class="pb-2 font-medium">Name</th>
          <th scope="col" class="hidden pb-2 font-medium sm:table-cell">Slug</th>
          <th scope="col" class="hidden w-28 pb-2 font-medium md:table-cell">Deleted</th>
          <th scope="col" class="w-44 pb-2 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.categories as cat (cat.id)}
          <tr class="border-b border-subtle/30">
            <td class="py-2 text-primary">{cat.name}</td>
            <td class="hidden py-2 text-secondary sm:table-cell">{cat.slug}</td>
            <td class="hidden py-2 text-xs text-secondary md:table-cell">
              {deletedAtDisplay(cat.deletedAt!)}
            </td>
            <td class="py-2 text-right">
              <Button
                variant="secondary"
                compact
                type="button"
                onclick={() => (pending = { kind: 'restore-category', id: cat.id, name: cat.name })}
              >
                <RotateCcw size={12} />restore
              </Button>
              <Button
                variant="danger-ghost"
                compact
                type="button"
                onclick={() =>
                  (pending = {
                    kind: 'purge-category',
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug
                  })}
              >
                <Trash2 size={12} />delete forever
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="mt-3 text-sm text-secondary">No categories in Trash.</p>
  {/if}

  <h2 class="mt-10 text-base font-semibold text-primary">Items</h2>
  {#if data.items.length > 0}
    <table class="mt-3 w-full text-sm">
      <thead>
        <tr class="border-b border-subtle text-left text-xs text-secondary">
          <th scope="col" class="pb-2 font-medium">Name</th>
          <th scope="col" class="hidden pb-2 font-medium sm:table-cell">Category</th>
          <th scope="col" class="hidden w-28 pb-2 font-medium md:table-cell">Deleted</th>
          <th scope="col" class="w-44 pb-2 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.items as item (item.id)}
          <tr class="border-b border-subtle/30">
            <td class="py-2 text-primary">{item.name}</td>
            <td class="hidden py-2 text-secondary sm:table-cell">{item.categoryName}</td>
            <td class="hidden py-2 text-xs text-secondary md:table-cell">
              {deletedAtDisplay(item.deletedAt!)}
            </td>
            <td class="py-2 text-right">
              <Button
                variant="secondary"
                compact
                type="button"
                onclick={() => (pending = { kind: 'restore-item', id: item.id, name: item.name })}
              >
                <RotateCcw size={12} />restore
              </Button>
              <Button
                variant="danger-ghost"
                compact
                type="button"
                onclick={() =>
                  (pending = {
                    kind: 'purge-item',
                    id: item.id,
                    name: item.name,
                    slug: item.slug
                  })}
              >
                <Trash2 size={12} />delete forever
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="mt-3 text-sm text-secondary">No items in Trash.</p>
  {/if}
</section>

<ConfirmDialog
  open={pending?.kind === 'restore-category' || pending?.kind === 'restore-item'}
  title="Restore from Trash?"
  message={pending ? `Restore "${pending.name}"?` : ''}
  confirmLabel="Restore"
  variant="primary"
  oncancel={() => (pending = null)}
  onconfirm={async () => {
    const target = pending;
    pending = null;
    if (!target) return;
    if (target.kind === 'restore-category') {
      await performAction('?/restoreCategory', target.id);
    } else if (target.kind === 'restore-item') {
      await performAction('?/restoreItem', target.id);
    }
  }}
/>

<ConfirmDialog
  open={pending?.kind === 'purge-category' || pending?.kind === 'purge-item'}
  title="Delete forever?"
  message={pending && (pending.kind === 'purge-category' || pending.kind === 'purge-item')
    ? `Permanently delete "${pending.name}". This cannot be undone — including any associated images.`
    : ''}
  confirmLabel="Delete forever"
  requireTypedConfirmation={pending &&
  (pending.kind === 'purge-category' || pending.kind === 'purge-item')
    ? pending.slug
    : undefined}
  oncancel={() => (pending = null)}
  onconfirm={async () => {
    const target = pending;
    pending = null;
    if (!target) return;
    if (target.kind === 'purge-category') {
      await performAction('?/permanentlyDeleteCategory', target.id);
    } else if (target.kind === 'purge-item') {
      await performAction('?/permanentlyDeleteItem', target.id);
    }
  }}
/>
