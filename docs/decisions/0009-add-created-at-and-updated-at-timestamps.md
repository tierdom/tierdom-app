# ADR-0009: Add created_at and updated_at Timestamp Columns

## Status

Accepted

## Context

The data has no temporal tracking. We need `created_at` and `updated_at` on every meaningful table to:

- Sort items by recency in the admin (e.g. "recently updated" on the dashboard, newest-first item ordering).
- Eventually show "last edited" on public pages.
- Provide a foundation for future temporal features.

SQLite via Drizzle. Pre-launch, so changes can fold into the existing initial migration rather than ship a new one.

## Decision

- **Type: `TEXT DEFAULT (datetime('now'))`** — ISO 8601 UTC strings via SQLite's native `datetime()`. Sorts lexicographically, so `ORDER BY updated_at DESC` works without coercion. Rejected: INTEGER unix timestamps — would require `strftime('%s', 'now')` in triggers and `Date(value * 1000)` on every read.
- **Auto-update via `AFTER UPDATE` triggers** that set `updated_at = datetime('now')`. The column DEFAULT handles inserts. Transparent to app code — no `.insert()` / `.update()` site needs changing. SQLite's `recursive_triggers` defaults OFF, so the UPDATE inside the trigger doesn't re-fire.
- **Tables: `category`, `tier_list_item`, `tag`, `page`.** The `item_tag` junction is excluded — no independent identity, bulk-replaced on edit, no UI need.
- **Frontend formatting** lives in `src/lib/format-date.ts` using `Intl.DateTimeFormat` for absolute dates and simple arithmetic for relative ("5m ago"). Temporal API rejected — polyfill required at the time.
- **Migration:** schema first, then regenerate the existing initial migration to keep the snapshot in sync. Triggers are appended manually since Drizzle doesn't generate them.

## Consequences

**Positive:**

- All existing insert/update code works untouched — triggers and defaults handle everything.
- Human-readable, sortable text values.
- Admin gains "recently updated" ordering and visible timestamps.
- Foundation for public "last edited" display.

**Negative:**

- TEXT timestamps use slightly more storage than INTEGER (~19 vs 4–8 bytes). Negligible at our scale.
- Triggers are invisible to Drizzle — must be hand-maintained in migration SQL.
- Reordering items bumps `updated_at`. Acceptable today; revisitable later.
