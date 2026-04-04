# ADR-0005: Frontend Styling

## Status

Accepted

## Context

The project needs a consistent, maintainable styling approach that supports:

- A dark-only design (no light mode)
- Multiple swappable themes in the future
- Mobile-first responsive layouts
- A minimalist, modern aesthetic with room for playful animations
- Good DX — utility classes over bespoke CSS where possible

## Decision

**Tailwind CSS v4** is the styling framework. It was already added to the project
via `sv add tailwindcss` (ADR-0003). v4's CSS-native `@theme` approach is a
significant improvement over the JS config of v3: tokens are plain CSS variables,
the build is faster, and theming integrates naturally with the cascade.

**Theming via CSS custom properties.** Semantic color tokens are defined on `:root`
using `--c-*` prefixed variables (e.g. `--c-canvas`, `--c-accent`). These are then
registered with Tailwind via `@theme inline`, which keeps values as `var()`
references at runtime. Swapping themes later requires only overriding `--c-*` values
under a `[data-theme="x"]` selector — no Tailwind config changes needed.

**Default theme: deep dark blue sci-fi.** Dark-only. The palette centres on a very
deep navy background (`#05090f`) with an electric sky-blue accent (`#38bdf8`). All
seven tier colors (S–F) are defined as `--tier-{letter}-bg` and `--tier-{letter}-fg`
variables and are part of every theme.

**Mobile-first.** All layouts start from the smallest viewport and add complexity
at wider breakpoints using Tailwind's responsive prefixes (`md:`, `lg:`). The
default maximum content width is `max-w-6xl` with horizontal padding.

**Minimalist class usage.** Prefer composing a small number of meaningful Tailwind
utilities over long chains of low-level classes. Avoid Tailwind utilities where a
single CSS property in `@layer base` or a component `<style>` block is cleaner.
Use modern CSS features (CSS nesting, `color-scheme`, `backdrop-filter`,
`scrollbar-color`) directly rather than reaching for a utility when the native
property is more expressive.

**Tier colors** are intentionally kept as raw CSS custom properties rather than
Tailwind utilities for now. They will be used inline (`style="background: var(--tier-s-bg)"`)
or in scoped component styles. They can be promoted to Tailwind utilities when a
tier display component is built.

## Consequences

- A future "light theme" or any alternate theme is a `[data-theme]` attribute
  plus a set of `--c-*` overrides — no structural changes required.
- `@theme inline` means Tailwind-generated CSS references `var()` at runtime,
  which adds a small indirection cost that is negligible in practice.
- Keeping tier colors as CSS variables (not utilities) means they won't appear
  in Tailwind's generated output until explicitly used; this is intentional.
- All components are expected to use `bg-canvas`, `text-primary`, `text-secondary`,
  `border-subtle`, and `text-accent` as their semantic color vocabulary.
