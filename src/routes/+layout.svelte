<script lang="ts">
  import './layout.css';
  import Navbar from '$lib/components/navbar/Navbar.svelte';
  import Prose from '$lib/components/Prose.svelte';

  let { children, data } = $props();
</script>

<svelte:head>
  <title>tierdom</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

<a
  href="#main-content"
  class="sr-only z-100 rounded bg-accent px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>
  Skip to main content
</a>

{#if data.setupComplete}
  <Navbar categories={data.categories} user={data.user} />
{/if}

<!-- Offset for fixed nav height -->
<main
  id="main-content"
  class="mx-auto min-h-screen max-w-6xl px-4"
  class:pt-14={data.setupComplete}
>
  {@render children()}
</main>

{#if data.setupComplete}
  <footer class="mt-16 border-t border-subtle py-8">
    <Prose
      html={data.footerHtml}
      size="sm"
      class="mx-auto max-w-6xl px-4 text-center text-secondary"
    />
  </footer>
{/if}
