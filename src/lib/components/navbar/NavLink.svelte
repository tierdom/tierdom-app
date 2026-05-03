<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { isActiveNavLink } from './nav-active';

  type Props = {
    href: string;
    label: string;
    onclick?: () => void;
    variant?: 'desktop' | 'mobile';
  };

  let { href, label, onclick, variant = 'desktop' }: Props = $props();

  let active = $derived(isActiveNavLink(href, page.url.pathname));
</script>

{#if variant === 'mobile'}
  <a
    href={resolve(href as '/')}
    {onclick}
    class="block w-full px-5 py-3 text-sm transition-colors {active
      ? 'border-l-2 border-accent bg-surface/50 text-accent'
      : 'border-l-2 border-transparent text-secondary hover:bg-surface hover:text-primary'}"
    aria-current={active ? 'page' : undefined}
  >
    {label}
  </a>
{:else}
  <a
    href={resolve(href as '/')}
    {onclick}
    class="inline-flex items-center border-b-2 px-1 py-1 text-sm transition-colors {active
      ? 'border-accent text-accent'
      : 'border-transparent text-secondary hover:text-primary'}"
    aria-current={active ? 'page' : undefined}
  >
    {label}
  </a>
{/if}
