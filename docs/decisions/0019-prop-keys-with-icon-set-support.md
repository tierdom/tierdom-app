# ADR-0019: Prop Keys with Icon Set Support

## Status

Accepted

## Context

ADR-0018 introduced category prop keys as a suggested `string[]` and explicitly noted future extensibility: "Per-key metadata (value type, enum options, validation) can be added later by evolving the `prop_keys` column from `string[]` to an array of objects."

In practice, some props benefit from visual representation.
A "Platform" prop for video games can show a controller icon for each platform value (PC, PlayStation, Nintendo Switch, etc.), giving items richer visual identity without requiring per-item images.

The previous version of Tierdom solved this with hand-crafted SVG icons rendered next to item thumbnails, and this ADR brings the same capability to the new codebase.

## Decision

Evolve the category `propKeys` column from `string[]` to `PropKeyConfig[]`:

```ts
type PropKeyConfig = { key: string; iconSet?: string };
```

This is a **breaking change** (acceptable in alpha).
No SQL migration is needed — the `prop_keys` column already stores JSON text, and the shape change is purely at the TypeScript level.
Existing `propKeys` data must be manually updated to the object format.

**Icon sets** are built-in collections of hand-crafted SVGs stored as static assets in `static/icons/{set-slug}/`.
Each set is registered in a TypeScript module (`src/lib/icon-sets/`) that maps value names to asset paths and alt text.
New icon sets are added by placing SVGs in the static directory and registering them in the module.

**Admin UI** gains an icon set selector per prop key in PropKeyEditor — a dropdown next to each key input, listing available icon sets or "none".

**Public display:** when an item's prop value matches a known icon in the linked set, the SVG renders next to the item thumbnail via an `<img>` tag with Tailwind's `invert` class for dark theme compatibility.
The SVGs use black strokes on transparent backgrounds, so inversion produces clean white strokes on the dark theme.
This approach is CDN-friendly — static assets can be served through any reverse proxy or CDN (e.g. Cloudflare).

**Validation:** the `iconSet` field is validated against known icon set slugs at form submission time, preventing orphaned references.

## Consequences

- **Visual metadata.** Iconized props give items richer visual identity without requiring per-item images.
- **CDN-friendly.** Static SVG assets are served as regular files, compatible with any CDN or reverse proxy.
- **Extensible.** New icon sets are added by placing SVGs in `static/icons/` and registering them in the icon-sets module. No schema changes needed.
- **Breaking change.** Existing `propKeys` data (`string[]`) must be manually updated to the object format. Acceptable in alpha.
- **Not enforced.** Icon sets are optional per prop key, and unrecognized prop values simply show no icon — they still appear as text in the prop pills.
