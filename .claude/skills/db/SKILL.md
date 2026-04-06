---
name: db
description: Query the local SQLite database directly. Run SELECT queries, inspect schema, check data state.
allowed-tools: Bash
---

## Database

- **Path**: `data/local.db` (relative to project root)
- **Engine**: SQLite via better-sqlite3
- **Query**: `sqlite3 data/local.db "<SQL>"`

For readable output use: `sqlite3 -column -header data/local.db "<SQL>"`

## Schema

```
category (id, slug, name, description, order, cutoff_s, cutoff_a, cutoff_b, cutoff_c, cutoff_d, cutoff_e, cutoff_f, created_at, updated_at)
tier_list_item (id, category_id→category, slug, name, description, score, order, created_at, updated_at)
  UNIQUE(category_id, slug)
tag (slug PK, label, created_at, updated_at)
item_tag (item_id→tier_list_item, tag_slug→tag) PK(item_id, tag_slug)
page (slug PK, title, content, created_at, updated_at)
```

All foreign keys cascade on delete. Timestamps are ISO text columns with auto-update triggers.

## Common patterns

```sql
-- Items in a category ordered by position
SELECT name, score, "order" FROM tier_list_item WHERE category_id = ? ORDER BY "order";

-- Items with their category name
SELECT i.name, i.score, c.name AS category FROM tier_list_item i JOIN category c ON c.id = i.category_id;

-- Tags for an item
SELECT t.label FROM item_tag it JOIN tag t ON t.slug = it.tag_slug WHERE it.item_id = ?;

-- Item counts per category
SELECT c.name, count(i.id) FROM category c LEFT JOIN tier_list_item i ON i.category_id = c.id GROUP BY c.id;
```

## Safety

- **Read-only by default.** Only run INSERT/UPDATE/DELETE when explicitly asked.
- **Never** DROP tables or run destructive DDL.
- Quote the `order` column name — it is a reserved word: `"order"`.

## Usage

If `$ARGUMENTS` is a SQL query, run it directly. If it is a natural language description, translate it to SQL first, then run it.

$ARGUMENTS
