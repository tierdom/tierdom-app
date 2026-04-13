<script lang="ts">
  import Prose from '$lib/components/Prose.svelte';
  import { scoreToBarColor, tierColors } from '$lib/tier';
  import type { Prop, PropKeyConfig } from '$lib/props';
  import { getIcon } from '$lib/icon-sets';

  type Props = {
    name: string;
    score: number;
    descriptionHtml?: string | null;
    tier: string;
    props?: Prop[];
    propKeyConfigs?: PropKeyConfig[];
    image?: string | null;
  };

  let {
    name,
    score,
    descriptionHtml,
    tier,
    props = [],
    propKeyConfigs = [],
    image
  }: Props = $props();

  let barColor = $derived(scoreToBarColor(score));

  let iconizedProps = $derived(
    props
      .map((p) => {
        const config = propKeyConfigs.find((pk) => pk.key.toLowerCase() === p.key.toLowerCase());
        const icon = config?.iconSet ? getIcon(config.iconSet, p.value) : undefined;
        return icon ? { ...icon, label: `${p.key}: ${p.value}` } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  );
</script>

<div class="flex flex-col gap-4">
  <h2 class="pr-8 text-xl font-bold text-primary">{name}</h2>

  <div class="flex items-center gap-3">
    <span
      class="inline-flex h-8 w-8 items-center justify-center rounded text-sm font-black"
      style:background={tierColors[tier as keyof typeof tierColors]?.bg ?? 'var(--c-subtle)'}
      style:color="#0a0a0a"
    >
      {tier}
    </span>
    <span class="text-lg font-bold text-primary">{score}</span>
    <span class="text-sm text-secondary">/ 100</span>
  </div>

  <div class="h-3 w-full overflow-hidden bg-black/30">
    <div class="h-full opacity-80" style:width="{score}%" style:background={barColor}></div>
  </div>

  {#if props.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each props as p (p.key)}
        <span class="rounded-full border border-subtle px-2.5 py-0.5 text-xs text-secondary"
          >{p.key}: {p.value}</span
        >
      {/each}
    </div>
  {/if}

  {#if descriptionHtml}
    <Prose html={descriptionHtml} size="sm" />
  {:else}
    <p class="text-sm leading-relaxed text-secondary">
      No specific item review. Only score ({score} / 100) and tier ({tier}) given.
    </p>
  {/if}

  {#if image || iconizedProps.length > 0}
    <div class="flex items-start gap-3">
      {#if image}
        <img
          src={image}
          alt={name}
          class="aspect-square h-24 rounded border border-subtle object-cover"
        />
      {/if}
      {#each iconizedProps as icon (icon.label)}
        <img src={icon.src} alt={icon.alt} class="h-24 w-auto invert" />
      {/each}
    </div>
  {/if}
</div>
