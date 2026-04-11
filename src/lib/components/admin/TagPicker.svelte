<script lang="ts">
  type Tag = { slug: string; label: string };

  let {
    allTags,
    selectedSlugs = [],
    onchange,
    oncreate
  }: {
    allTags: Tag[];
    selectedSlugs?: string[];
    onchange: (slugs: string[]) => void;
    oncreate: (label: string) => Promise<Tag>;
  } = $props();

  let query = $state('');
  let open = $state(false);
  let highlightIndex = $state(0);
  let createdTags = $state<Tag[]>([]);
  let knownTags = $derived([...allTags, ...createdTags]);
  let containerEl: HTMLDivElement | undefined = $state();

  let filtered = $derived(
    knownTags.filter(
      (t) =>
        !selectedSlugs.includes(t.slug) &&
        t.label.toLowerCase().includes(query.toLowerCase().trim())
    )
  );

  let showCreateOption = $derived(
    query.trim().length > 0 &&
      !knownTags.some((t) => t.label.toLowerCase() === query.trim().toLowerCase())
  );

  let totalOptions = $derived(filtered.length + (showCreateOption ? 1 : 0));

  function select(slug: string) {
    onchange([...selectedSlugs, slug]);
    query = '';
    highlightIndex = 0;
  }

  function remove(slug: string) {
    onchange(selectedSlugs.filter((s) => s !== slug));
  }

  async function create(label: string) {
    const newTag = await oncreate(label);
    createdTags = [...createdTags, newTag];
    onchange([...selectedSlugs, newTag.slug]);
    query = '';
    highlightIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open = true;
      highlightIndex = Math.min(highlightIndex + 1, totalOptions - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!open || totalOptions === 0) return;
      if (highlightIndex < filtered.length) {
        select(filtered[highlightIndex].slug);
      } else if (showCreateOption) {
        create(query.trim());
      }
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleBlur(e: FocusEvent) {
    if (containerEl && !containerEl.contains(e.relatedTarget as Node)) {
      open = false;
    }
  }

  function handleInput() {
    highlightIndex = 0;
    open = true;
  }
</script>

<div class="tag-picker" bind:this={containerEl} onfocusout={handleBlur}>
  <label for="tag-picker-input" class="mb-1 block text-sm text-secondary">Tags</label>

  {#if selectedSlugs.length > 0}
    <div class="mb-2 flex flex-wrap gap-1.5">
      {#each selectedSlugs as slug (slug)}
        {@const t = knownTags.find((t) => t.slug === slug)}
        <span class="pill">
          {t?.label ?? slug}
          <button
            type="button"
            class="pill-remove"
            onclick={() => remove(slug)}
            aria-label="Remove {t?.label ?? slug}">×</button
          >
        </span>
      {/each}
    </div>
  {/if}

  <div class="relative">
    <input
      id="tag-picker-input"
      type="text"
      bind:value={query}
      onfocus={() => (open = true)}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Search or create tags…"
      class="w-full rounded border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none"
      autocomplete="off"
    />

    {#if open && totalOptions > 0}
      <ul class="dropdown">
        {#each filtered as tag, i (tag.slug)}
          <li class:highlighted={i === highlightIndex}>
            <button
              type="button"
              class="dropdown-item"
              onmousedown={(e) => {
                e.preventDefault();
                select(tag.slug);
              }}
              onmouseenter={() => (highlightIndex = i)}
            >
              {tag.label}
            </button>
          </li>
        {/each}
        {#if showCreateOption}
          <li class:highlighted={highlightIndex === filtered.length}>
            <button
              type="button"
              class="dropdown-item create-item"
              onmousedown={(e) => {
                e.preventDefault();
                create(query.trim());
              }}
              onmouseenter={() => (highlightIndex = filtered.length)}
            >
              + Create "{query.trim()}"
            </button>
          </li>
        {/if}
      </ul>
    {/if}
  </div>

  {#each selectedSlugs as slug (slug)}
    <input type="hidden" name="tags" value={slug} />
  {/each}
</div>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--c-accent-muted);
    color: var(--c-accent);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .pill-remove {
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    font-size: 0.875rem;
    line-height: 1;
    opacity: 0.7;
    padding: 0 0.125rem;
  }

  .pill-remove:hover {
    opacity: 1;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 40;
    margin-top: 0.25rem;
    max-height: 12rem;
    overflow-y: auto;
    border: 1px solid var(--c-subtle);
    border-radius: 0.375rem;
    background: var(--c-elevated);
    list-style: none;
    padding: 0.25rem 0;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    color: var(--c-primary);
    background: none;
    border: none;
    cursor: pointer;
  }

  .highlighted .dropdown-item {
    background: var(--c-subtle);
  }

  .create-item {
    color: var(--c-accent);
    font-style: italic;
  }
</style>
