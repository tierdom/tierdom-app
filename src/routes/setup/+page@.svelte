<script lang="ts">
  import '../layout.css';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let selected = $state('minimal');
  let generateImages = $state(true);

  const presets = [
    {
      value: 'empty',
      title: 'Empty',
      description:
        'Blank Home and About pages. No categories or items. Start completely from scratch.'
    },
    {
      value: 'minimal',
      title: 'Minimal',
      description:
        'Simple Home and About pages, one sample category with a single item. A quick starting point.'
    },
    {
      value: 'demo',
      title: 'Full Demo',
      description:
        'Fully populated with demo categories (Games, Books, Movies, etc.), tags, and 95+ ranked items.'
    }
  ];
</script>

<svelte:head>
  <title>Setup — tierdom</title>
</svelte:head>

<div class="flex min-h-screen items-start justify-center px-4 pt-[15vh] md:pt-[20vh]">
  <div class="w-full max-w-md">
    <h1 class="mb-2 text-center text-xl font-bold text-primary">Welcome to tierdom</h1>
    <p class="mb-8 text-center text-sm text-secondary">
      Choose how to set up your instance. You can change everything later in the admin panel.
    </p>

    {#if form?.error}
      <p class="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {form.error}
      </p>
    {/if}

    <form method="POST" class="flex flex-col gap-3">
      {#each presets as preset (preset.value)}
        <label
          class="flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors {selected ===
          preset.value
            ? 'border-accent bg-accent/10'
            : 'border-subtle bg-surface hover:border-accent/40'}"
        >
          <input
            type="radio"
            name="preset"
            value={preset.value}
            bind:group={selected}
            class="mt-0.5 shrink-0 accent-accent"
          />
          <div>
            <span class="text-sm font-semibold text-primary">{preset.title}</span>
            <p class="mt-1 text-xs text-secondary">{preset.description}</p>
          </div>
        </label>
      {/each}

      {#if selected === 'demo'}
        <fieldset class="mt-3 flex flex-col gap-2 border-t border-subtle pt-4">
          <legend class="mb-1 text-xs font-semibold tracking-wide text-secondary uppercase"
            >Options</legend
          >
          <label
            class="grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-1 rounded-lg border border-subtle bg-surface px-4 py-3 hover:border-accent/40"
          >
            <input
              type="checkbox"
              name="images"
              value="1"
              bind:checked={generateImages}
              class="self-center accent-accent"
            />
            <span class="text-sm font-semibold text-primary">Generate sample images</span>
            <p class="col-start-2 text-xs text-secondary">
              Create a unique placeholder image for every demo item. Makes the tier lists look fully
              populated.
            </p>
          </label>
        </fieldset>
      {/if}

      <div class="mt-4">
        <Button type="submit">Finalize setup...</Button>
      </div>
    </form>
  </div>
</div>
