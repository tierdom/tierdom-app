# ADR-0009: Add created_at and updated_at Timestamp Columns

## Status

Accepted

## Context

The tier list application has no temporal tracking on its data. We need `created_at` and `updated_at` columns on every meaningful table to:

- Sort items by recency in the admin UI (e.g. "recently updated" on the dashboard, newest-first ordering in the items table)
- Eventually show "last edited" dates on public-facing pages
- Provide a foundation for future features that depend on knowing when data was created or modified

The application uses SQLite (via Drizzle ORM) and is not yet live, so we can slipstream changes into the existing initial migration rather than creating a new one.

## Decision

### Column type: TEXT with ISO 8601 UTC strings

Store timestamps as `TEXT DEFAULT (datetime('now'))` in SQLite. This leverages SQLite's native `datetime()` function, produces human-readable values (`2026-04-05 14:30:00`), and sorts lexicographically — so `ORDER BY updated_at DESC` works correctly without type coercion.

The alternative (INTEGER unix timestamps) was rejected because it would require `strftime('%s', 'now')` in triggers and `new Date(value * 1000)` on every read, adding unnecessary complexity.

### Auto-update mechanism: SQLite AFTER UPDATE triggers

Each of the four tables gets an `AFTER UPDATE` trigger that sets `updated_at = datetime('now')`. No INSERT trigger is needed — the column's `DEFAULT (datetime('now'))` handles initial values for both `created_at` and `updated_at`.

This approach is transparent to application code: none of the existing 10+ files with `.insert()` or `.update()` calls need modification. SQLite's `recursive_triggers` pragma defaults to OFF, so the UPDATE inside the trigger won't re-fire itself.

### Tables receiving timestamps: 4 of 5

Timestamps are added to `category`, `tier_list_item`, `tag`, and `page`. The `item_tag` junction table is excluded because:

- It has no independent identity (composite PK only)
- Tags are bulk-replaced (delete all + re-insert) on every item edit, making `created_at` meaningless
- No UI needs "when was this tag attached" information

### Frontend date formatting: Intl.DateTimeFormat

A small utility (`src/lib/format-date.ts`) uses `Intl.DateTimeFormat` for locale-aware absolute dates and simple arithmetic for relative dates ("5m ago", "2d ago"). The Temporal API was considered but is not yet widely available without polyfills. The `+ 'Z'` suffix is appended before parsing SQLite's timezone-naive strings to ensure correct UTC interpretation.

### Migration strategy: regenerate and append

The Drizzle schema is updated first, then the existing migration is deleted and regenerated via `drizzle-kit generate` to keep the snapshot in sync. Triggers are manually appended since Drizzle does not generate them.

## Consequences

**Positive:**
- All existing insert/update code works without changes — triggers and defaults handle everything
- ISO 8601 text is human-readable and sorts correctly
- Admin UI gains meaningful "recently updated" ordering and visible timestamps
- Foundation laid for future public-facing "last edited" display

**Negative:**
- TEXT timestamps use slightly more storage than INTEGER unix timestamps (~19 bytes vs 4–8 bytes per value), though this is negligible for our data volume
- Triggers are invisible to Drizzle — they must be maintained manually in the migration SQL
- Reordering items (changing `order` column) will bump `updated_at`, which may not always be desired — but for now this is acceptable and even useful behaviour
