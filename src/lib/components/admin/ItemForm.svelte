<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Plus, Save, X, Trash2 } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import FormField from '$lib/components/admin/FormField.svelte';
  import ImageField from '$lib/components/admin/ImageField.svelte';
  import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
  import PropEditor from '$lib/components/admin/PropEditor.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';
  import type { Prop, PropKeyConfig } from '$lib/props';

  type Category = { id: string; name: string; propKeys: PropKeyConfig[] };

  let {
    mode,
    categories,
    initialValues = {},
    initialProps = [],
    returnTarget,
    backUrl
  }: {
    mode: 'create' | 'edit';
    categories: Category[];
    initialValues?: {
      name?: string;
      slug?: string;
      score?: number;
      description?: string | null;
      categoryId?: string | null;
      imageHash?: string | null;
    };
    initialProps?: Prop[];
    returnTarget: 'categories' | 'items';
    backUrl: string;
  } = $props();

  const loader = createAdminLoader();
  const { enhance } = loader;

  let dirty = $state(false);
  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore state_referenced_locally — intentional: mutable copy of initial value
  let selectedCategoryId = $state(initialValues.categoryId ?? '');
  let suggestedKeys = $derived(
    (categories.find((c) => c.id === selectedCategoryId)?.propKeys ?? []).map((pk) => pk.key)
  );

  let pendingDiscard = $state(false);
  let pendingDelete = $state(false);

  function markDirty() {
    dirty = true;
  }

  function cancel() {
    if (dirty) {
      pendingDiscard = true;
      return;
    }
    goto(resolve(backUrl as '/'));
  }

  const performDelete = loader.withLoading(async () => {
    const body = new FormData();
    body.set('_returnTarget', returnTarget);
    await fetch('?/delete', { method: 'POST', body });
    await goto(resolve(backUrl as '/'));
  });
</script>

<AdminOverlay loading={loader.loading} />

<form
  id="item-form"
  method="POST"
  action="?/save"
  enctype="multipart/form-data"
  use:enhance
  oninput={markDirty}
  class="mt-6 flex flex-col gap-3"
>
  <input type="hidden" name="_returnTarget" value={returnTarget} />

  <div class="flex flex-col gap-1">
    <label for="categoryId" class="text-xs font-medium text-secondary">
      Category<span class="text-red-400"> *</span>
    </label>
    <select
      id="categoryId"
      name="categoryId"
      required
      onchange={(e) => (selectedCategoryId = e.currentTarget.value)}
      class="rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
    >
      {#if mode === 'create'}
        <option value="">Select a category…</option>
      {/if}
      {#each categories as cat (cat.id)}
        <option value={cat.id} selected={cat.id === initialValues.categoryId}>{cat.name}</option>
      {/each}
    </select>
  </div>

  <FormField label="Name" name="name" value={initialValues.name} required />
  <FormField
    label="Slug"
    name="slug"
    value={initialValues.slug}
    help="Auto-generated from name if empty"
  />
  <FormField
    label="Score"
    name="score"
    type="number"
    value={initialValues.score}
    required
    min={0}
    max={100}
    step={1}
  />
  <ImageField imageHash={initialValues.imageHash} onchange={markDirty} />
  <PropEditor props={initialProps} {suggestedKeys} onchange={() => markDirty()} />
  <MarkdownField label="Description" name="description" value={initialValues.description} />
</form>

{#if loader.error}
  <p class="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
    {loader.error}
  </p>
{/if}

<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
  {#if mode === 'create'}
    <Button type="submit" form="item-form"><Plus size={16} />Create</Button>
  {:else}
    <Button type="submit" form="item-form"><Save size={16} />Save</Button>
  {/if}
  <Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
  {#if mode === 'edit'}
    <Button variant="danger" type="button" onclick={() => (pendingDelete = true)}>
      <Trash2 size={16} />Move to Trash
    </Button>
  {/if}
</div>

<ConfirmDialog
  open={pendingDiscard}
  title="Discard unsaved changes?"
  message="You have unsaved changes. Discard them and leave this page?"
  confirmLabel="Discard"
  variant="danger"
  oncancel={() => (pendingDiscard = false)}
  onconfirm={async () => {
    pendingDiscard = false;
    await goto(resolve(backUrl as '/'));
  }}
/>

<ConfirmDialog
  open={pendingDelete}
  title="Move item to Trash?"
  message={`Move "${initialValues.name ?? 'this item'}" to Trash. You can restore it later.`}
  confirmLabel="Move to Trash"
  oncancel={() => (pendingDelete = false)}
  onconfirm={async () => {
    pendingDelete = false;
    await performDelete();
  }}
/>
