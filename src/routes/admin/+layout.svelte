<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';

  let { children } = $props();

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/cms', label: 'CMS' },
    { href: '/admin/categories', label: 'Categories' },
    { href: '/admin/items', label: 'Items (all)' }
  ];
</script>

<nav aria-label="Admin" class="-mx-4 border-b border-subtle bg-surface md:mx-0">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
    <span class="hidden text-xs font-bold tracking-widest text-accent uppercase md:inline"
      >Admin</span
    >
    <div class="flex flex-wrap items-center gap-1">
      {#each links as link (link.href)}
        <a
          href={resolve(link.href as '/')}
          class="rounded px-3 py-1 text-sm transition-colors {page.url.pathname === link.href
            ? 'bg-elevated text-primary'
            : 'text-secondary hover:text-primary'}"
        >
          {link.label}
        </a>
      {/each}
    </div>
  </div>
</nav>

<div class="py-6">
  {@render children()}
</div>
