<script lang="ts">
  import { resolve } from '$app/paths';
  import { Download, Upload } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">Tools</h1>

<section>
  <h2 class="text-xl font-bold text-primary">Tools</h2>
  <p class="mt-1 text-sm text-secondary">
    Take your data with you. Everything in tierdom — your tier lists, CMS pages, and item images —
    is yours to keep.
  </p>

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    <a
      href={resolve('/admin/tools/export')}
      class="flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4 transition-colors hover:border-accent/40"
    >
      <!-- From the user perspective "Upload" icon makes more sense here. -->
      <Upload class="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <div class="min-w-0">
        <p class="font-medium text-primary">Export</p>
        <p class="mt-1 text-xs text-secondary">
          Export a ZIP with your database, structured content, and images.
        </p>
      </div>
    </a>

    <div
      class="flex items-start gap-4 rounded-lg border border-subtle bg-elevated px-5 py-4 opacity-60"
      aria-disabled="true"
    >
      <!-- From the user perspective "Download" icon makes more sense here. -->
      <Download class="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
      <div class="min-w-0">
        <p class="font-medium text-primary">Import</p>
        <p class="mt-1 text-xs text-secondary">
          Restore content from a previous export. <span class="text-accent"
            >Under construction.</span
          >
        </p>
      </div>
    </div>
  </div>
</section>
