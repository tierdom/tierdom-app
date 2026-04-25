# ADR-0022: Soft Delete and Trash

## Status

Accepted

## Context

- Roadmap item (`README.md`): "Soft-delete for items + trash (and recover) feature + housekeeping to clean up later".
- ADR-0006 deferred soft-delete: "There is no undo/soft-delete… would need revisiting".
- Hard delete is unforgiving — a misclicked category cascades to all its items and their images.
- Drizzle has no equivalent to EF Core global query filters, so "default reads exclude deleted" must be enforced by other means or it will rot.

## Decision

### Schema

- Add nullable `deleted_at TEXT` to `category` and `tier_list_item`. `NULL` = active; ISO-8601 datetime = soft-deleted at that moment. Type matches `created_at`/`updated_at` (ADR-0009). Soft-delete writes `datetime('now')` via SQL so the format is identical to the existing timestamp columns.
- Add nullable `deleted_with_cascade INTEGER` (boolean) to `tier_list_item`. Set to `1` when an item is soft-deleted as part of a category cascade, `NULL` otherwise. `restoreCategory` matches on this flag — not on `deleted_at` equality — so a same-millisecond standalone trash and cascade can never collide.
- Replace `category_slug_unique` and `item_category_slug` with **partial unique indexes** scoped to `deleted_at IS NULL`, so a slug can be reused while the original sits in trash.
- Existing `tier_list_item.category_id` `ON DELETE CASCADE` FK kept — still correct for permanent delete.

### Read filtering — default-safe via views

- `src/lib/server/db/schema.ts` exports flip:

  | Name                                 | Kind                                                                        |
  | ------------------------------------ | --------------------------------------------------------------------------- |
  | `category`, `tierListItem`           | `sqliteView('*_active')` filtering `deleted_at IS NULL` — default read path |
  | `categoryTable`, `tierListItemTable` | underlying `sqliteTable` — required for writes; opt-in for trash reads      |

- `db.insert`/`update`/`delete` only accept `SQLiteTable` — TypeScript fails any write that targets a view, so writes can't silently bypass the filter.
- `db.select().from(view)` works unchanged → existing read sites auto-filter with no per-call edits.
- Reading deleted rows requires importing `*Table` — a deliberate, greppable signal.

### Cascade

- Soft-delete a category: app code, single transaction. The category gets `deleted_at = datetime('now')`; each currently-active child item gets the same timestamp **and** `deleted_with_cascade = 1`.
- Restore a category: clears `deleted_at` on the category and on items where `deleted_with_cascade = 1` (and `deleted_at IS NOT NULL`); also clears the flag. Items the user trashed independently keep their state.
- An earlier draft used timestamp equality alone to link cascaded items to the category; a unit test caught the millisecond-collision bug, so we added the explicit flag column. Easier to reason about than disambiguating timestamps.
- Triggers rejected: would have to coordinate with the `_suppress_updated_at` contract; app-code cascade is clearer and unit-testable.

### Permanent delete

- `permanentlyDeleteCategory`: walk all items in the category (including already-trashed), `deleteImage()` each, then `db.delete(categoryTable)` — FK CASCADE drops item rows.
- `permanentlyDeleteItem`: `deleteImage()` then `db.delete(tierListItemTable)`. Same pattern as today.

### Images

- Stay on disk while soft-deleted. Cleanup happens only on permanent delete (current `deleteImage(hash)` from `src/lib/server/images.ts`, per ADR-0011).
- Justified by ADR-0011's 8–15 KB per image and small expected data sets.

### UI

- Admin "Delete" buttons → "Move to Trash". Simple `ConfirmDialog` (no typed gate — restore is cheap).
- New `/admin/trash` route lists soft-deleted categories and items with **Restore** (simple confirm) and **Delete forever** (typed-confirmation per ADR-0021 — irreversible).
- Slug conflicts on restore: block with a friendly error in `loader.error`. No auto-rename.
- "Trash" added to admin nav after "Items (all)".

### Out of scope (v1)

- Housekeeping / auto-purge job (column is in place; deferrable).
- "Empty trash" bulk action.
- Soft-delete for `page` / `site_setting` / `user`.
- Auto-rename on slug conflict during restore.
- Toast/notification system.

## Consequences

- **Positive:** Mistakes are recoverable. Default read path is provably filtered (TypeScript-enforced _and_ asserted by unit tests against the view). Slug reuse works while the old record sits in trash. Image storage cost stays small (cleanup only on permanent delete). Reuses existing primitives — `ConfirmDialog`, `Button`, `deleteImage()`, `admin-loader`. `deleted_at` stays a clean ISO timestamp (no embedded marker), so future cleanup jobs can range-query it directly.
- **Negative:** Two names per entity (`category` vs `categoryTable`) — small ergonomic cost. Drizzle Kit re-emits the view's column list on every schema change; that's why migration `0004_add_cascade_flag.sql` ships a `DROP VIEW` + `CREATE VIEW`. Trigger-cascade option not taken; if a future write path skips the helpers it could leave orphaned cascade state — mitigated by funnelling all soft-deletes through `src/lib/server/db/soft-delete.ts`. Slug-conflict-on-restore is a hand-resolved error, not a smart auto-rename.
- **Neutral:** Schema change is additive (columns + indexes + views); existing data unaffected. Sets `deleted_at` up for a future cleanup job without committing to one now.
