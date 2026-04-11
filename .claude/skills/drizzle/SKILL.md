---
name: drizzle
description: MUST be used whenever generating, creating, or managing Drizzle ORM database migrations — including after any schema change (adding columns, tables, indexes). Handles migration naming conventions and journal updates.
allowed-tools: Bash Read Write Edit Glob
---

## Project setup

- Schema: `src/lib/server/db/schema.ts`
- Migrations folder: `drizzle/` (committed to repo)
- Runtime DB: `data/db.sqlite` (gitignored)
- Config: `drizzle.config.ts` — reads `DATA_PATH` dir from env, appends `db.sqlite`
- DB client (`src/lib/server/db/index.ts`) runs `migrate()` automatically on every boot — no manual migration step needed at runtime

## Key conventions

- `drizzle-kit generate` produces a random name like `0001_funny_animal.sql` — **always rename** it to `0001_<description>.sql` and update the matching tag in `drizzle/meta/_journal.json`
- Never run `db:push` — always use `db:generate` + `db:migrate` so migrations are tracked
- Primary keys: use `text('id').primaryKey().$defaultFn(randomUUID)` (import from `node:crypto`) — not auto-increment integers. This enables clean export/import merging across instances
- Foreign keys: use `text` columns to match UUID PKs, and pass `{ onDelete: 'cascade' }` to `.references()`
- Compound unique constraints go in the table callback: `(t) => [unique('name').on(t.col1, t.col2)]`
- Compound PKs (junction tables): `(t) => [primaryKey({ columns: [t.a, t.b] })]`
- Cutoffs stored as nullable integers; null = use app-level default
- Always set `foreign_keys = ON` and `journal_mode = WAL` pragmas on the client

## Workflow for a new migration

```bash
DATA_PATH=./data npm run db:generate
```

**IMPORTANT — immediately after generating:**

1. Rename the `.sql` file from the random name (e.g. `0001_funny_animal.sql`) to a descriptive one (e.g. `0001_add_auth_tables.sql`).
2. Update the matching `"tag"` in `drizzle/meta/_journal.json` to match the new filename (without `.sql`).
3. If the migration needs manual SQL (e.g. `updated_at` triggers), add it to the generated file before committing.

$ARGUMENTS
