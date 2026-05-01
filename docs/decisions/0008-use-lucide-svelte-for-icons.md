# ADR-0008: Use lucide-svelte for Icons

## Status

Accepted

## Context

The project needs a small set of icons (5–25), mostly for the admin and occasionally on public pages.
Icons must be simple, monochrome, color-inheritable; minimal footprint; permissive license; trivial to add.

Options considered:

- **Raw inline SVGs** — zero deps, smallest output; requires manual path maintenance and a custom wrapper.
- **unplugin-icons + Iconify** — build-time tree-shake from any Iconify set; adds plugin tooling.
- **lucide-svelte** — official Svelte bindings for Lucide; tree-shakeable per-icon import.
- **SVG sprite sheet** — single cacheable file; needs sprite tooling.
- **Other libraries (Tabler, Phosphor)** — similar shape, different aesthetics, varying Svelte-binding maturity.

## Decision

Use **lucide-svelte** (v1.0.1, ISC).

- Per-icon import tree-shakes to a few hundred bytes each.
- Zero transitive dependencies.
- JS-based components avoid the Vite pre-bundling pitfall the SvelteKit docs warn about with one-`.svelte`-per-icon libraries.
- Permissive license, compatible with any project type.

## Consequences

- Best DX for adding icons — single import statement, no plugin config.
- Large icon set (~1500 icons) gives headroom without switching libraries.
- Installed package is large on disk (full source set), though only used icons ship to clients.
- Coupled to Lucide's icon style; switching later means updating imports across components.
