<script lang="ts">
  import type { PageData } from './$types';
  import { goto, pushState } from '$app/navigation';
  import { page } from '$app/state';
  import TierListItem from '$lib/components/TierListItem.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import ItemDetail from '$lib/components/ItemDetail.svelte';
  import Prose from '$lib/components/Prose.svelte';

  let { data }: { data: PageData } = $props();

  const tierStyles: Record<string, string> = {
    S: 'bg-[var(--tier-s-bg)] text-[var(--tier-s-fg)]',
    A: 'bg-[var(--tier-a-bg)] text-[var(--tier-a-fg)]',
    B: 'bg-[var(--tier-b-bg)] text-[var(--tier-b-fg)]',
    C: 'bg-[var(--tier-c-bg)] text-[var(--tier-c-fg)]',
    D: 'bg-[var(--tier-d-bg)] text-[var(--tier-d-fg)]',
    E: 'bg-[var(--tier-e-bg)] text-[var(--tier-e-fg)]',
    F: 'bg-[var(--tier-f-bg)] text-[var(--tier-f-fg)]',
  };

  const tierBorderStyles: Record<string, string> = {
    S: 'border-[var(--tier-s-bg)]',
    A: 'border-[var(--tier-a-bg)]',
    B: 'border-[var(--tier-b-bg)]',
    C: 'border-[var(--tier-c-bg)]',
    D: 'border-[var(--tier-d-bg)]',
    E: 'border-[var(--tier-e-bg)]',
    F: 'border-[var(--tier-f-bg)]',
  };

  let allItems = $derived(
    data.tiers.flatMap((t) => t.items.map((item) => ({ ...item, tier: t.tier }))),
  );

  let selectedItem = $derived.by(() => {
    const slug = page.state.item ?? page.url.searchParams.get('item');
    return slug ? (allItems.find((i) => i.slug === slug) ?? null) : null;
  });

  function openItem(slug: string) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- page.url.pathname already includes the base path
    pushState(`${page.url.pathname}?item=${encodeURIComponent(slug)}`, { item: slug });
  }

  function closeItem() {
    // Use goto (not pushState) because pushState never updates page.url
    // (sveltejs/kit#11492). After a fresh load with ?item=slug, pushState
    // would leave page.url.searchParams stale and the dialog would stay open.
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- page.url.pathname already includes the base path
    goto(page.url.pathname, { noScroll: true, keepFocus: true });
  }
</script>

<svelte:head>
  <title>{selectedItem ? `${selectedItem.name} — ` : ''}{data.category.name} — tierdom</title>
</svelte:head>

<section class="py-10">
  <h1 class="text-2xl font-bold text-primary">{data.category.name}</h1>
  {#if data.category.descriptionHtml}
    <Prose html={data.category.descriptionHtml} size="sm" class="mt-2 max-w-none" />
  {/if}

  {#if allItems.length > 0}
    <div class="mt-8 flex flex-col gap-1">
      {#each data.tiers as { tier, items } (tier)}
        <div class="flex overflow-hidden border-2 {tierBorderStyles[tier]}">
          <h2 class="sr-only">{tier} Tier</h2>
          <div
            class="flex w-14 shrink-0 items-start justify-center pt-3 text-xl font-black {tierStyles[
              tier
            ]}"
            aria-hidden="true"
          >
            {tier}
          </div>

          <div class="flex flex-1 flex-wrap bg-surface">
            {#each items as item (item.id)}
              <TierListItem
                name={item.name}
                score={item.score}
                image={item.image ?? undefined}
                gradient={item.placeholder ?? undefined}
                cardProps={item.cardProps}
                onclick={() => openItem(item.slug)}
              />
            {/each}
            {#if items.length === 0}
              <div class="aspect-square w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-[12.5%]"></div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="mt-8 text-secondary">No items in this category yet.</p>
  {/if}
</section>

{#if selectedItem}
  <Dialog open onclose={closeItem} label="{selectedItem.name} — item details">
    <ItemDetail
      name={selectedItem.name}
      score={selectedItem.score}
      descriptionHtml={selectedItem.descriptionHtml}
      tier={selectedItem.tier}
      props={selectedItem.props}
      propKeyConfigs={data.category.propKeys}
      image={selectedItem.image ?? undefined}
    />
  </Dialog>
{/if}
