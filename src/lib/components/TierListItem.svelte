<script lang="ts">
  import { scoreToBarColor } from '$lib/tier';

  type Props = {
    name: string;
    score: number;
    image?: string;
    gradient?: string;
    cardProps?: string[];
    onclick?: () => void;
  };

  let { name, score, image, gradient, cardProps = [], onclick }: Props = $props();

  let cardPropsLine = $derived(cardProps.join(', '));

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
  class="group relative aspect-square w-1/2 cursor-pointer overflow-hidden border-2 border-black/90 transition-[border-color] duration-200 hover:border-black focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-1/3 md:w-1/5 lg:w-1/6 xl:w-1/7"
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

  <div
    class="title-clip absolute inset-x-0 top-0 max-h-[60%] overflow-hidden bg-linear-to-b from-black/50 to-transparent p-2"
  >
    <span
      class="block origin-top-left pr-4 text-xs leading-tight font-extrabold text-white drop-shadow-md transition-transform duration-200 group-hover:scale-115 sm:text-sm"
    >
      {name}
    </span>
  </div>

  <div
    class="absolute right-2 bottom-3 left-2 flex max-h-9 items-end gap-4 overflow-hidden text-xs leading-none font-bold text-white opacity-60 group-hover:opacity-100"
  >
    <span class=" drop-shadow-md transition-[transform,opacity] duration-200">
      {score}
    </span>

    {#if cardPropsLine}
      <span class="card-props grow text-right">{cardPropsLine}</span>
    {/if}
  </div>

  <div
    class="absolute inset-x-0 bottom-0 h-1 bg-black/30 transition-[height] duration-200 group-hover:h-2"
  >
    <div class="h-full opacity-60" style:width="{score}%" style:background={barColor}></div>
  </div>
</div>

<style>
  /* mask-image with calc() can't be expressed cleanly as a Tailwind utility. */
  .title-clip {
    mask-image: linear-gradient(to bottom, black calc(100% - 10px), transparent 100%);
  }

  /* Native CSS: group-hover transform + multi-stop text-shadow would be a
     wall of arbitrary-value utilities; scoped CSS reads clearer. */
  .card-props {
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.7),
      0 0 4px rgba(0, 0, 0, 0.4);
    transform-origin: bottom right;
  }
</style>
