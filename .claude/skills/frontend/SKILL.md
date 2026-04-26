---
name: frontend
description: Write Svelte 5 components and SvelteKit pages following the project's frontend conventions — dark theme, mobile-first, minimalist Tailwind, modern CSS.
allowed-tools: Read Glob Grep Write Edit
---

Help me build frontend components and pages for this SvelteKit project.

## Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`)
- **SvelteKit** file-based routing
- **Tailwind CSS v4** — utility classes via `@theme inline` CSS variables
- **TypeScript** throughout

## Color vocabulary

Always use semantic utilities, never raw Tailwind color names:

| Utility          | Use for                      |
| ---------------- | ---------------------------- |
| `bg-canvas`      | Page backgrounds             |
| `bg-surface`     | Cards, panels                |
| `bg-elevated`    | Nav, dropdowns, modals       |
| `border-subtle`  | All borders and dividers     |
| `text-primary`   | Main body text               |
| `text-secondary` | Labels, captions, muted text |
| `text-accent`    | Accent text, active states   |

For tier colors use CSS variables directly: `style="background: var(--tier-s-bg); color: var(--tier-s-fg)"`.

## Component conventions

- **Svelte 5 runes only** — no legacy `export let`, no `$:`, no `on:` event syntax
- Props via `let { prop, ...rest } = $props()`
- Events via callback props: `onclick`, `onchange`, etc.
- Keep components small and single-purpose
- Co-locate component-specific CSS in `<style>` blocks using `@apply` sparingly;
  prefer direct Tailwind utilities in the template
- When a component accepts a navigation path, call `resolve()` inside the component/snippet
  rather than requiring callers to pass pre-resolved paths. This keeps the ESLint `no-navigation-without-resolve` rule happy without needing suppression comments

## Layout rules

- **Mobile-first**: base styles target small screens; add `md:` / `lg:` for wider
- Max content width: `max-w-6xl mx-auto px-4`
- Default vertical rhythm: `py-12` for sections, `mt-4` / `mt-8` for spacing
- Sticky/fixed elements: always `z-50` and `backdrop-blur-sm` for floating UI

## Tailwind usage

- Use Tailwind utilities for spacing, typography, flex/grid layout, and color
- Use native CSS (in `@layer base` or `<style>`) for:
  - Transitions and animations
  - Pseudo-element styling
  - Complex selectors that would produce noisy class strings
- Avoid chains longer than ~8 utilities on a single element — extract to a component

## Modern CSS

Prefer modern browser features directly:

- `color-scheme: dark` on `html`
- CSS nesting inside `<style>` blocks
- `backdrop-filter` for frosted-glass effects
- `container` and `@container` queries for component-level responsiveness
- `:has()`, `:is()`, `:where()` for expressive selectors
- `scrollbar-color` / `scrollbar-width` for custom scrollbars

## Accessibility

Target: **WCAG 2.1 Level AA**. Pages must read well as plain unstyled HTML.

- Use semantic elements: `<nav>`, `<main>`, `<section>`, `<table>`, `<ul>`, `<dialog>`, etc.
- Every page needs exactly one `<h1>`; headings must not skip levels
- All form controls need a visible `<label>` or `aria-label`
- Decorative SVGs/icons get `aria-hidden="true"`
- Interactive custom widgets need proper ARIA roles (`combobox`, `menu`, `listbox`, etc.)
- Color must not be the only way to convey information
- Links inside text blocks need underlines (not just color difference)
- Don't suppress Svelte a11y warnings (`svelte-ignore a11y_*`) without strong justification

## Forms that target `+server.ts` endpoints

When a `<form>` posts to a SvelteKit endpoint (no `+page` exists at that path — only a `+server.ts`), two subtleties bite:

1. **Add `data-sveltekit-reload` to the form.** Without it, SvelteKit's client-side router intercepts same-origin GET form submissions and tries to navigate to the URL as if it were a page. It finds no `+page`, throws `SvelteKitError: Not found` in DevTools, and the only reason the request still completes is that the browser's native form submission also fires in parallel. The attribute opts the form out of the router so the browser handles it natively.

2. **If you flip local UI state in `onsubmit`, defer it with `setTimeout(() => state = true, 0)`.** Svelte 5 flushes effects from event handlers eagerly enough that setting state synchronously can unmount the form before the browser dispatches the submission, cancelling the in-flight request. The macrotask defers the re-render past the browser's submission step. Don't `preventDefault()` — let the browser submit natively, then swap the UI on the next tick.

This pattern shows up in download forms (the export wizard) and any other "submit form, get a file back, swap to a confirmation panel" flow.

## Code style

- Alphabetise Tailwind class strings (Prettier handles this automatically)
- One blank line between script, template, and style blocks
- No inline `style=""` attributes except for dynamic CSS variable values
- **No labelling comments** in templates — don't add `<!-- Header -->` or `<!-- Score bar -->` above markup that is self-evident.
  Only add comments that explain _why_ something non-obvious is done (e.g. `<!-- Scrim overlay for text legibility -->`)

---

> **Note on animations:** We like playful micro-animations that make the UX feel
> alive — subtle hover lifts, smooth colour transitions, gentle entrance fades.
> Keep durations short (150–300 ms) and prefer `transition-*` utilities or CSS
> `@keyframes` in `<style>` blocks over JavaScript-driven animations.

$ARGUMENTS
