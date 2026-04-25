<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Plus, X } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
  import FormField from '$lib/components/admin/FormField.svelte';
  import MarkdownField from '$lib/components/admin/MarkdownField.svelte';
  import PropKeyEditor from '$lib/components/admin/PropKeyEditor.svelte';
  import AdminOverlay from '$lib/components/admin/AdminOverlay.svelte';
  import { createAdminLoader } from '$lib/components/admin/admin-loader.svelte';

  const loader = createAdminLoader();
  const { enhance } = loader;

  let dirty = $state(false);
  let pendingDiscard = $state(false);

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
</script>

<svelte:head>
  <title>New category — Admin — tierdom</title>
</svelte:head>

<section>
  <AdminOverlay loading={loader.loading} />
  <div class="flex items-center gap-3">
    <a href={resolve('/admin/categories')} class="text-sm text-secondary hover:text-primary"
      >&larr; Back</a
    >
    <h1 class="text-xl font-bold text-primary">New category</h1>
  </div>

  <form
    id="create-category"
    method="POST"
    action="?/create"
    use:enhance
    oninput={markDirty}
    class="mt-6 flex flex-col gap-3"
  >
    <FormField label="Name" name="name" required />
    <FormField label="Slug" name="slug" help="Auto-generated from name if empty" />
    <MarkdownField label="Description" name="description" />
    <PropKeyEditor propKeys={[]} onchange={markDirty} />
    <h2 class="mt-2 text-sm font-semibold text-secondary">Tier cutoffs</h2>
    <p class="text-xs text-secondary/70">
      Minimum score to reach each tier. Leave empty for defaults (S=90, A=80, B=70, C=55, D=40,
      E=20, F=0).
    </p>
    <div class="grid grid-cols-4 gap-3 sm:grid-cols-7">
      <FormField label="S" name="cutoffS" type="number" min={0} max={100} />
      <FormField label="A" name="cutoffA" type="number" min={0} max={100} />
      <FormField label="B" name="cutoffB" type="number" min={0} max={100} />
      <FormField label="C" name="cutoffC" type="number" min={0} max={100} />
      <FormField label="D" name="cutoffD" type="number" min={0} max={100} />
      <FormField label="E" name="cutoffE" type="number" min={0} max={100} />
      <FormField label="F" name="cutoffF" type="number" min={0} max={100} />
    </div>
  </form>

  <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
    <Button type="submit" form="create-category"><Plus size={16} />Create</Button>
    <Button variant="secondary" type="button" onclick={cancel}><X size={16} />Cancel</Button>
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
