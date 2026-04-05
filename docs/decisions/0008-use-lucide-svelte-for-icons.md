# ADR-0008: Use lucide-svelte for Icons

## Status

Accepted

## Context

The project needs a small set of icons (5-25) primarily for the admin interface, with occasional use on public-facing pages. Icons should be simple, monochrome, and able to inherit the page's color scheme.

Key requirements:

- **Minimal footprint** — both in network transfer to users and in package weight within the repository
- **Permissive license** — must be safe for any type of project
- **Low maintenance** — adding a new icon should be trivial

Options considered:

1. **Raw inline SVGs** — zero dependencies and smallest possible output, but requires manually copying SVG path data and maintaining a custom wrapper component
2. **unplugin-icons + Iconify** — Vite plugin that tree-shakes icons from any Iconify set at build time; near-zero runtime cost but adds build tooling complexity
3. **lucide-svelte** — official Svelte bindings for the Lucide icon set; tree-shakeable with simple `import { Icon } from 'lucide-svelte'` usage
4. **SVG sprite sheet** — single cacheable file, but requires manual sprite management or a build script
5. **Other component libraries** (Tabler, Phosphor) — similar to Lucide but with different aesthetics and varying Svelte support maturity

## Decision

Use **lucide-svelte** (v1.0.1, ISC license) as the project's icon library.

- Import only the icons needed — each tree-shakes to ~300-500 bytes
- Zero transitive dependencies
- Uses JS-based components, avoiding the Vite pre-bundling performance issue that SvelteKit documentation warns about with libraries that ship one `.svelte` file per icon
- ISC license is permissive and compatible with any project type

## Consequences

- **Positive**: Best developer experience — adding an icon is a single import statement. Tree-shaking keeps the bundle lean. No build plugin configuration needed.
- **Positive**: Large icon set (~1500 icons) available if needs grow beyond the initial 5-25, without switching libraries.
- **Negative**: The installed package is ~25 MB on disk (all icon source files), though only used icons ship to users.
- **Neutral**: The project is now coupled to Lucide's icon style. Switching to a different icon set later would require updating imports across components.
