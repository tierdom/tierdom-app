<script lang="ts">
  import { tierColors, type Tier } from '$lib/tier';

  let { tier }: { tier: Tier } = $props();

  let colors = $derived(tierColors[tier]);
</script>

<span
  class="inline-flex h-5 w-5 items-center justify-center rounded text-[0.625rem] leading-none font-bold"
  style="background:{colors.bg};color:{colors.fg}"
>
  {tier}
</span>
