<!--
  Renders pre-sanitised HTML (from $lib/server/markdown.ts) inside a
  Tailwind Typography prose container. All {@html} usage is centralised
  here so the eslint suppression and prose-invert setup live in one place.
-->

<script lang="ts">
  type Props = {
    html: string;
    size?: 'sm' | 'base' | 'lg';
    class?: string;
  };

  let { html, size = 'base', class: className = '' }: Props = $props();

  const sizeClasses: Record<string, string> = {
    sm: 'prose-sm',
    base: '',
    lg: 'prose-lg',
  };

  let classes = $derived(
    ['prose prose-invert', sizeClasses[size], className].filter(Boolean).join(' '),
  );
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitised by DOMPurify server-side -->
<div class={classes}>{@html html}</div>
