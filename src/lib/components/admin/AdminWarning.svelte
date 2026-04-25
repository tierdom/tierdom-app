<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ResolvedPathname } from '$app/types';
  import { TriangleAlert } from 'lucide-svelte';

  type Props = {
    /** Optional CTA URL — already-resolved by the caller. */
    href?: ResolvedPathname;
    /** CTA link text. Required when href is set. */
    cta?: string;
    /** Banner body. */
    children: Snippet;
  };

  let { href, cta, children }: Props = $props();
</script>

<div
  role="status"
  class="flex flex-wrap items-start gap-3 rounded border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
>
  <TriangleAlert size={18} class="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
  <div class="min-w-0 flex-1">
    {@render children()}
  </div>
  {#if href && cta}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve — href is typed as ResolvedPathname -->
    <a {href} class="shrink-0 font-medium underline hover:text-amber-100">{cta}</a>
  {/if}
</div>
