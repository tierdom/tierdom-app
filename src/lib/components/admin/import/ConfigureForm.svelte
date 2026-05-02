<script lang="ts">
  import { untrack } from 'svelte';
  import { applyAction, deserialize } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { ArrowLeft, ArrowRight } from 'lucide-svelte';
  import Button from '$lib/components/admin/Button.svelte';
  import type { ImporterOption, ImporterOptionValue } from '$lib/server/import/types';
  import type { ImportPhase } from './phase';

  type Props = {
    label: string;
    file: File;
    options: ImporterOption[];
    setPhase: (phase: ImportPhase | null) => void;
  };

  let { label, file, options, setPhase }: Props = $props();

  let values = $state<Record<string, ImporterOptionValue>>(
    untrack(() => Object.fromEntries(options.map((o) => [o.id, o.default]))),
  );

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setPhase('planning');
    const fd = new FormData();
    fd.set('file', file, file.name);
    for (const o of options) {
      const v = values[o.id];
      if (o.type === 'checkbox') {
        if (v === true) fd.set(`option:${o.id}`, 'on');
      } else {
        fd.set(`option:${o.id}`, String(v));
      }
    }
    const res = await fetch('?/plan', { method: 'POST', body: fd });
    const result = deserialize(await res.text());
    if (result.type === 'success' || result.type === 'failure') {
      await invalidateAll();
    }
    await applyAction(result);
    setPhase(null);
  }
</script>

<button
  type="button"
  onclick={() => setPhase('form')}
  class="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
>
  <ArrowLeft class="h-3 w-3" aria-hidden="true" /> Pick a different file
</button>
<h2 class="mt-2 text-xl font-bold text-primary">Configure {label} import</h2>
<p class="mt-1 text-xs text-secondary">{file.name}</p>

<form onsubmit={submit} class="mt-6 space-y-4">
  {#each options as opt (opt.id)}
    <fieldset class="rounded-lg border border-subtle bg-elevated px-5 py-4">
      <legend class="px-2 text-sm font-medium text-primary">{opt.label}</legend>
      {#if opt.type === 'checkbox'}
        <label class="flex items-start gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={values[opt.id] as boolean}
            onchange={(e) => (values[opt.id] = e.currentTarget.checked)}
            class="mt-0.5"
          />
          <span>
            {opt.help ?? `Include ${opt.label.toLowerCase()}.`}
          </span>
        </label>
      {:else}
        <div class="space-y-2 text-sm text-secondary">
          {#if opt.help}
            <p class="text-xs">{opt.help}</p>
          {/if}
          {#each opt.choices as choice (choice.value)}
            <label class="flex items-start gap-2">
              <input
                type="radio"
                name={`option:${opt.id}`}
                value={choice.value}
                checked={values[opt.id] === choice.value}
                onchange={() => (values[opt.id] = choice.value)}
                class="mt-0.5"
              />
              <span>{choice.label}</span>
            </label>
          {/each}
          {#if opt.footnote}
            <p class="pt-1 text-xs italic">{opt.footnote}</p>
          {/if}
        </div>
      {/if}
    </fieldset>
  {/each}

  <div class="flex flex-wrap items-center gap-3">
    <Button type="submit" variant="primary">
      <ArrowRight size={14} aria-hidden="true" />
      Continue
    </Button>
    <Button type="button" variant="secondary" onclick={() => setPhase('form')}>Back</Button>
  </div>
</form>
