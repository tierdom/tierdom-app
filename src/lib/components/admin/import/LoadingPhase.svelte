<script lang="ts">
  import { Loader2 } from 'lucide-svelte';

  let { title, subtitle }: { title: string; subtitle: string } = $props();
</script>

<div class="mt-10 flex flex-col items-center text-center" aria-live="polite">
  <Loader2 class="h-10 w-10 animate-spin text-accent" aria-hidden="true" />
  <h2 class="mt-4 text-xl font-bold text-primary">{title}</h2>
  <p class="mt-2 max-w-md text-sm text-secondary">{subtitle}</p>
</div>
