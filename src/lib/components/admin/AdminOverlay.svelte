<script lang="ts">
  import { fade } from 'svelte/transition';

  let { loading = false }: { loading: boolean } = $props();
</script>

{#if loading}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="size-8 animate-spin rounded-full border-[3px] border-white/15 border-t-[var(--c-accent)]"
    ></div>
  </div>
{/if}
