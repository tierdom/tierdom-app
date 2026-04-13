<script lang="ts">
  import '../layout.css';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let selected = $state('');
  let generateImages = $state(true);
  let password = $state('');

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
        'Fully populated with demo categories (Games, Books, Movies, etc.) and 95+ ranked items.'
    }
  ];
</script>

<svelte:head>
  <title>Setup — tierdom</title>
</svelte:head>

<div class="flex min-h-screen items-start justify-center px-4 pt-6 pb-16 sm:pt-[10vh]">
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

      {#if selected}
        <fieldset class="mt-3 flex flex-col gap-4 border-t border-subtle pt-4">
          <legend class="mb-1 text-xs font-semibold tracking-wide text-secondary uppercase"
            >Options</legend
          >

          <div>
            <span class="text-sm font-semibold text-primary">Sample images</span>
            <label class="mt-2 grid cursor-pointer grid-cols-[1rem_1fr] gap-x-3 gap-y-0.5">
              <input
                type="checkbox"
                name="images"
                value="1"
                bind:checked={generateImages}
                class="self-center accent-accent"
              />
              <span class="text-xs text-secondary">
                Generate a unique placeholder image for every item
              </span>
            </label>
          </div>

          <div>
            <span class="text-sm font-semibold text-primary">Admin account</span>
            <div class="mt-2 flex flex-col gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-xs text-secondary">Username</span>
                <input
                  type="text"
                  name="username"
                  value="admin"
                  required
                  autocomplete="username"
                  class="rounded border border-subtle bg-canvas px-3 py-1.5 text-sm text-primary focus:border-accent focus:outline-none"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs text-secondary">Password</span>
                <input
                  type="password"
                  name="password"
                  bind:value={password}
                  autocomplete="new-password"
                  class="rounded border border-subtle bg-canvas px-3 py-1.5 text-sm text-primary focus:border-accent focus:outline-none"
                />
                {#if !password}
                  <span class="text-xs font-medium text-amber-400"
                    >Defaults to "admin" — only for demos, change for production</span
                  >
                {/if}
              </label>
            </div>
          </div>
        </fieldset>
      {/if}

      <div class="mt-4">
        <Button type="submit">Finalize setup...</Button>
      </div>
    </form>
  </div>
</div>
