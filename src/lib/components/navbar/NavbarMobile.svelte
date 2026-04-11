<script lang="ts">
  import { enhance } from '$app/forms';
  import NavLink from './NavLink.svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
    categories: { id: string; slug: string; name: string }[];
    extraLinks: { href: string; label: string }[];
    user: { id: string; username: string } | null;
  };

  let { open, onclose, categories, extraLinks, user }: Props = $props();

  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<div
  class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden
    {open ? 'opacity-100' : 'pointer-events-none opacity-0'}"
  onclick={onclose}
  onkeydown={undefined}
  role="button"
  tabindex="-1"
  aria-label="Close menu"
></div>

<aside
  class="fixed top-0 left-0 z-50 flex h-full w-72 max-w-[75vw] flex-col border-r border-subtle bg-elevated transition-transform duration-300 ease-out md:hidden
    {open ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="border-b border-subtle px-5 py-4">
    <span class="text-sm font-bold tracking-widest text-accent uppercase">tierdom</span>
  </div>

  <nav class="flex-1 overflow-y-auto py-2">
    {#each categories as cat (cat.id)}
      <NavLink href={`/category/${cat.slug}`} label={cat.name} variant="mobile" onclick={onclose} />
    {/each}
    <div class="my-2 border-t border-subtle"></div>
    {#each extraLinks as link (link.href)}
      <NavLink href={link.href} label={link.label} variant="mobile" onclick={onclose} />
    {/each}
  </nav>

  <div class="border-t border-subtle px-5 py-4">
    {#if user}
      <p class="mb-2 text-xs text-secondary">Signed in as {user.username}</p>
      <NavLink href="/admin" label="Admin" variant="mobile" onclick={onclose} />
      <form method="POST" action="/admin/logout" use:enhance class="mt-2">
        <button
          type="submit"
          class="cursor-pointer text-sm text-secondary transition-colors hover:text-primary"
        >
          Sign out
        </button>
      </form>
    {:else}
      <NavLink href="/admin/login" label="Sign in" variant="mobile" onclick={onclose} />
    {/if}
  </div>
</aside>
