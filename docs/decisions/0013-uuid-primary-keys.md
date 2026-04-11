# ADR-0013: UUID Primary Keys

## Status

Accepted

## Context

Categories and items used auto-incrementing integer primary keys.
While simple, integer IDs cause conflicts when merging data from multiple instances.
A planned export/import feature will let users back up their tier lists as JSON and restore or merge them into another instance.
When two independent instances both have an item with `id = 5`, there is no way to tell whether they represent the same item or two different ones.

## Decision

Replace integer primary keys on `category`, `tier_list_item`, and the `item_tag` junction table with text columns containing UUIDs generated via `crypto.randomUUID()`.
Drizzle schema uses `text('id').primaryKey().$defaultFn(randomUUID)` so IDs are assigned automatically on insert.
Foreign key columns (`category_id`, `item_id`) are changed to `text` to match.

Tables that already used text primary keys (user, session, tag, page) are unchanged.

## Consequences

- Exported data from different instances can be merged by UUID: matching UUIDs are the same item, differing UUIDs are distinct.
- No auto-increment means application code must never rely on ID ordering; the `order` column is used instead.
- UUIDs are longer than integers, marginally increasing storage and index size, but this is negligible for the expected data volumes.
- This is a breaking change: existing databases must be recreated from scratch.
