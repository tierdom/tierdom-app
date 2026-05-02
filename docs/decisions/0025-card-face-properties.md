# ADR-0025: Card-face properties on public tier list items

## Status

Accepted

## Context

- Tier list cards on the public site show only name + score; categories with rich props (e.g. _Platform_ for video games, single-emoji marker for any category) have no glanceable surface.
- Existing `PropKeyConfig` is `{ key, iconSet? }` per category. Need a way to flag a key as card-visible.

## Decision

- **Extend `PropKeyConfig`** with optional `showOnCard?: boolean`. Persisted only when `true` to keep stored JSON tidy.
- **No DB migration.** `propKeys` is a JSON `text` column; old rows treat the field as falsy.
- **Public load** (`src/routes/category/[slug]/+page.server.ts`) computes per-item `cardProps: string[]` by intersecting `category.propKeys.filter(showOnCard)` with `item.props` in propKey order. Only values are passed; keys are not rendered on the card.
- **Render position**: bottom-right of `TierListItem`, mirroring the existing bottom-left score, white text + drop-shadow over scrim.
- **Layout**: values comma-joined, right-aligned, wrapping upward with `max-height: 50%` of the card. Rejected during prototype: gradient mask fade, per-value pills, single-line `text-overflow: ellipsis` — wrap-upward keeps multi-platform listings legible without truncation.
- **Admin editor**: `PropKeyEditor.svelte` legend renamed "Prop keys" → "Properties"; row layout widens the icon-set column and inserts a "Show on card" checkbox between iconset and delete.

## Consequences

- **Positive:** glanceable per-category metadata; opt-in per key; no schema migration.
- **Negative:** narrow card real estate constrains overflow strategies; users may mark too many keys and crowd the card (mitigated by `max-height: 50%` with grow-upward wrapping).
- **Neutral:** card now consumes `cardProps` from the load; future card overlays (e.g. icon glyphs from `iconSet`) can extend the same channel.

## Coverage

|                              | Statements | Branches | Functions | Lines  |
| ---------------------------- | ---------- | -------- | --------- | ------ |
| Baseline at proposal         | 98.44%     | 93.66%   | 98.57%    | 98.59% |
| After initial implementation | 98.45%     | 93.78%   | 98.57%    | 98.60% |

Aggregate ticked up slightly (new validator branches added with tests). `props.ts` 98.63 → 98.70, `forms.ts` 100 → 100. Svelte components and route loaders are excluded from unit coverage by config; verified via component tests where reasonable plus E2E (76 deterministic tests pass on branch close).
