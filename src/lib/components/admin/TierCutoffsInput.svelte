<script lang="ts">
  type Cutoffs = {
    S?: number | null;
    A?: number | null;
    B?: number | null;
    C?: number | null;
    D?: number | null;
    E?: number | null;
    F?: number | null;
  };

  let { values = {} }: { values?: Cutoffs } = $props();

  const tiers = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const;
</script>

<div class="flex flex-col gap-2 sm:grid sm:grid-cols-7 sm:gap-3">
  {#each tiers as tier (tier)}
    <div class="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-1">
      <label for="cutoff{tier}" class="w-6 shrink-0 text-xs font-medium text-secondary sm:w-auto">
        {tier}
      </label>
      <input
        id="cutoff{tier}"
        name="cutoff{tier}"
        type="number"
        value={values[tier] ?? ''}
        min={0}
        max={100}
        class="min-w-0 flex-1 rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none sm:flex-none"
      />
    </div>
  {/each}
</div>
