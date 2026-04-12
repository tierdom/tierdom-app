<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>{page.status} — tierdom</title>
</svelte:head>

<section
  class="flex flex-col items-center justify-center text-center"
  style="min-height: 85vh; padding-top: 6rem;"
>
  <h1 class="sr-only">Error {page.status}</h1>
  <p class="leading-none font-black text-accent" aria-hidden="true" style="font-size: 6rem;">
    {page.status}
  </p>

  {#if page.status === 404}
    <p class="mt-6 text-xl text-primary">This page wandered off the tier list.</p>
    <p class="mt-2 text-secondary">Whatever you were looking for, it's not ranked here.</p>
  {:else}
    <p class="mt-6 text-xl text-primary">Something went wrong.</p>
    {#if page.error?.message}
      <p class="mt-2 text-secondary">{page.error.message}</p>
    {/if}
  {/if}

  <a
    href={resolve('/')}
    class="mt-4 inline-block border border-subtle px-4 py-2 text-secondary transition-colors hover:bg-surface hover:text-primary"
  >
    Back to safety
  </a>
</section>
