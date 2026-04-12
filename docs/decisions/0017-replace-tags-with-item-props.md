# ADR-0017: Replace Tags with Item Props

## Status

Accepted

## Context

Tier list items currently use a **tag** system: a shared `tag` table (keyed by slug) linked to items via an `item_tag` junction table.
Tags are global labels like "Indie" or "Masterpiece" that can be attached to any item across any category.

This model has limitations:

- Tags are generic labels with no structure.
  Items need category-specific metadata — a game's platform, a book's ISBN, a movie's release year — that tags cannot represent.
- Tags are shared entities.
  Adding a new tag creates a global resource visible across all categories, which doesn't match the per-category nature of item metadata.
- The junction table adds query complexity (JOINs on every item load) for little benefit at the current scale.

A key-value **props** system is more expressive: each item carries its own ordered list of `{key, value}` pairs.
This naturally supports category-specific metadata while remaining simple to query and edit.

## Decision

Remove the `tag` and `item_tag` tables entirely.
Add a `props` column to `tier_list_item` as a JSON text column storing an ordered array of `{key: string, value: string}` objects.

**Constraints:**

- Maximum 10 props per item
- Keys: non-empty, max 64 characters, unique within an item
- Values: non-empty, max 128 characters

**Storage format:** `text('props', { mode: 'json' })` in Drizzle ORM — a SQLite TEXT column with automatic JSON serialization.
The array order determines display order.
Default value is an empty array `[]`.

**Validation:** A shared `validateProps()` function in `src/lib/props.ts` (importable by both server and client code) enforces all constraints.

**Two future prop categories:**

- **Known props** — keys with specialized support (e.g. `Platform` for games might get an autocomplete UI, `ISBN` might get format validation).
  Not implemented yet; all props are currently generic.
- **Generic props** — plain key-value pairs with no special behavior.

**UI changes:**

- Public: props display as "Key: Value" pills where tags used to appear.
- Admin: a 2-column table editor (key + value inputs) with drag-to-reorder, replacing the tag picker dropdown.
- The `/admin/tags` CRUD routes are removed entirely.

**Migration approach:** This is a breaking change.
All existing migrations are reworked into a single initial migration reflecting the new schema.

## Consequences

- **Simpler schema.** No junction table, no separate tag entity. One fewer table to query and manage.
- **Item-local data.** Props belong to the item, not shared globally. Duplicating a key-value across items is intentional (no normalization penalty).
- **Category-specific metadata.** Games can have `Platform`, books can have `ISBN`, movies can have `Genre` — without any schema changes.
- **Future extensibility.** "Known" props can later add specialized UI, validation, or filtering without changing the storage format.
- **Lost: tag reuse.** Tags were shared; props are not. There is no autocomplete from other items' props. This is an acceptable trade-off — tag reuse was not a valued feature.
- **Lost: tag management UI.** The standalone `/admin/tags` pages are removed. Props are managed inline on the item edit form.
