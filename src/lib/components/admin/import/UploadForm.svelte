<script lang="ts">
  import { resolve } from '$app/paths';
  import { enhance } from '$app/forms';
  import { ArrowLeft, Upload } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ImportPhase } from './phase';

  type Props = {
    label: string;
    description: string;
    accept?: string;
    maxMb: number;
    setPhase: (phase: ImportPhase | null) => void;
  };

  let { label, description, accept, maxMb, setPhase }: Props = $props();
</script>

<a
  href={resolve('/admin/tools/import')}
  class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
>
  <ArrowLeft class="h-3 w-3" aria-hidden="true" /> All importers
</a>
<h2 class="mt-2 text-xl font-bold text-primary">{label}</h2>
<p class="mt-1 text-sm text-secondary">{description}</p>

<form
  method="POST"
  action="?/plan"
  enctype="multipart/form-data"
  use:enhance={() => {
    setPhase('planning');
    return async ({ update }) => {
      await update({ reset: false });
      setPhase(null);
    };
  }}
  class="mt-6 space-y-4 rounded-lg border border-subtle bg-elevated px-5 py-4"
>
  <div>
    <label for="import-file" class="block text-sm font-medium text-primary">File</label>
    <input
      id="import-file"
      name="file"
      type="file"
      {accept}
      required
      class="mt-2 block w-full text-sm text-secondary file:mr-3 file:rounded-md file:border file:border-subtle file:bg-canvas file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:border-accent/40"
    />
    <p class="mt-1 text-xs text-secondary">Maximum {maxMb} MB.</p>
  </div>

  <Button type="submit" variant="primary">
    <Upload size={14} aria-hidden="true" />
    Continue
  </Button>
</form>
