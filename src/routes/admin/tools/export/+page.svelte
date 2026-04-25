<script lang="ts">
  import { resolve } from '$app/paths';
  import { Download, Info, TriangleAlert } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
</script>

<svelte:head>
  <title>Export — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">Export</h1>

<section class="mx-auto max-w-2xl px-4">
  <p class="text-xs text-secondary">
    <a href={resolve('/admin/tools')} class="hover:text-primary">&larr; Tools</a>
  </p>
  <h2 class="mt-2 text-xl font-bold text-primary">Export</h2>
  <p class="mt-2 text-sm text-secondary">
    Pick what you want to take with you. The download starts as soon as you submit; the file streams
    directly from the server.
  </p>

  <form
    method="GET"
    action={resolve('/admin/tools/export/download')}
    class="mt-6 flex flex-col gap-4"
  >
    <fieldset class="flex flex-col gap-3 rounded-lg border border-subtle bg-elevated p-5">
      <legend class="px-2 text-sm font-medium text-primary">Include</legend>

      <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
        <input type="checkbox" name="db" value="1" checked class="self-center accent-accent" />
        <span class="text-sm font-medium text-primary">SQLite database</span>
        <span class="col-start-2 flex items-start gap-1 text-xs text-secondary">
          <Info size={12} class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          Full snapshot — includes soft-deleted (Trash) items.
        </span>
      </label>

      <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
        <input type="checkbox" name="json" value="1" checked class="self-center accent-accent" />
        <span class="text-sm font-medium text-primary">JSON content</span>
        <span class="col-start-2 flex items-start gap-1 text-xs text-amber-200">
          <TriangleAlert size={12} class="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
          Excludes soft-deleted (Trash) items. Use SQLite if you need them.
        </span>
      </label>

      <label class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
        <input type="checkbox" name="images" value="1" class="self-center accent-accent" />
        <span class="text-sm font-medium text-primary">Images</span>
        <span class="col-start-2 text-xs text-secondary">
          All tier-list item images (.webp). Largest payload.
        </span>
      </label>

      <label
        class="grid cursor-not-allowed grid-cols-[1rem_1fr] gap-x-3 gap-y-1 opacity-50"
        aria-disabled="true"
      >
        <input type="checkbox" disabled class="self-center accent-accent" />
        <span class="text-sm font-medium text-primary">
          Markdown <span class="text-xs font-normal text-accent">(coming soon)</span>
        </span>
        <span class="col-start-2 text-xs text-secondary">
          Pages and CMS content as markdown files.
        </span>
      </label>
    </fieldset>

    <div>
      <Button type="submit">
        <Download size={16} aria-hidden="true" />
        Download ZIP
      </Button>
    </div>
  </form>
</section>
