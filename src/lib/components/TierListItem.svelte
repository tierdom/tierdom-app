<script lang="ts">
  import { scoreToBarColor } from '$lib/tier';

  type CardPropStyle = 'fade' | 'pills' | 'comma';

  type Props = {
    name: string;
    score: number;
    image?: string;
    gradient?: string;
    cardProps?: string[];
    cardStyle?: CardPropStyle;
    onclick?: () => void;
  };

  let {
    name,
    score,
    image,
    gradient,
    cardProps = [],
    cardStyle = 'fade',
    onclick,
  }: Props = $props();

  const MAX_CARD_PROPS = 3;
  let visibleCardProps = $derived(cardProps.slice(0, MAX_CARD_PROPS));
  let cardPropsTruncated = $derived(cardProps.length > MAX_CARD_PROPS);

  function handleKeydown(e: KeyboardEvent) {
    if (onclick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onclick();
    }
  }

  let barColor = $derived(scoreToBarColor(score));

  const scrim =
    'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.5) 100%)';
</script>

<div
  class="group relative aspect-square w-1/2 cursor-pointer overflow-hidden border-2 border-black/90 transition-[border-color] duration-200 hover:border-black focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-[12.5%]"
  title={name}
  role="button"
  tabindex={0}
  {onclick}
  onkeydown={handleKeydown}
>
  <!-- Background: placeholder gradient underneath, then image on top -->
  {#if gradient}
    <div class="absolute inset-0" style:background-image={gradient}></div>
  {:else if !image}
    <div class="absolute inset-0 bg-linear-to-br from-elevated via-surface to-elevated"></div>
  {/if}
  {#if image}
    <img src={image} alt={name} class="absolute inset-0 h-full w-full object-cover" />
  {/if}

  <!-- Scrim overlay for text legibility (only over images) -->
  {#if image || gradient}
    <div class="absolute inset-0" style:background={scrim}></div>
  {/if}

  <div class="absolute inset-x-0 top-0 bg-linear-to-b from-black/50 to-transparent p-2">
    <span
      class="block origin-top-left pr-4 text-xs leading-tight font-extrabold text-white drop-shadow-md transition-transform duration-200 group-hover:scale-115 sm:text-sm"
    >
      {name}
    </span>
  </div>

  <span
    class="absolute bottom-3 left-1.5 block origin-bottom-left text-xs leading-none font-bold text-white drop-shadow-md transition-transform duration-200 group-hover:scale-115"
  >
    {score}
  </span>

  {#if visibleCardProps.length > 0}
    {#if cardStyle === 'comma'}
      <div class="card-props card-props-comma">
        <span class="card-props-line">
          {visibleCardProps.join(' · ')}{cardPropsTruncated ? ' …' : ''}
        </span>
      </div>
    {:else if cardStyle === 'pills'}
      <div class="card-props card-props-pills">
        {#each visibleCardProps as v (v)}
          <span class="card-pill"><span class="card-pill-text">{v}</span></span>
        {/each}
        {#if cardPropsTruncated}
          <span class="card-pill card-pill-ellipsis">…</span>
        {/if}
      </div>
    {:else}
      <div class="card-props card-props-fade">
        {#each visibleCardProps as v (v)}
          <span class="card-fade-line">{v}</span>
        {/each}
        {#if cardPropsTruncated}
          <span class="card-fade-line card-fade-ellipsis">…</span>
        {/if}
      </div>
    {/if}
  {/if}

  <div
    class="absolute inset-x-0 bottom-0 h-1 bg-black/30 transition-[height] duration-200 group-hover:h-2"
  >
    <div class="h-full opacity-60" style:width="{score}%" style:background={barColor}></div>
  </div>
</div>

<style>
  .card-props {
    position: absolute;
    right: 0.375rem;
    bottom: 0.5rem;
    max-width: 65%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
    pointer-events: none;
    color: white;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.7),
      0 0 4px rgba(0, 0, 0, 0.4);
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.1;
  }

  .card-props-fade .card-fade-line {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to left, transparent 0, black 1.25em);
    mask-image: linear-gradient(to left, transparent 0, black 1.25em);
    /* a small right padding so the fade falls inside the card */
    padding-right: 0.125rem;
  }

  .card-props-fade .card-fade-ellipsis {
    opacity: 0.7;
  }

  .card-props-comma {
    flex-direction: row;
  }

  .card-props-comma .card-props-line {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to left, transparent 0, black 1.25em);
    mask-image: linear-gradient(to left, transparent 0, black 1.25em);
    padding-right: 0.125rem;
  }

  .card-props-pills .card-pill {
    max-width: 100%;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    border-radius: 0.25rem;
    padding: 0.0625rem 0.3125rem;
    text-shadow: none;
    overflow: hidden;
  }

  .card-props-pills .card-pill-text {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to left, transparent 0, black 1em);
    mask-image: linear-gradient(to left, transparent 0, black 1em);
  }

  .card-props-pills .card-pill-ellipsis {
    opacity: 0.75;
    padding: 0 0.3125rem;
  }
</style>
