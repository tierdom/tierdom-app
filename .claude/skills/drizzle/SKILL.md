---
name: drizzle
description: Create or manage Drizzle ORM migrations and schema for this project (SQLite, better-sqlite3).
allowed-tools: Bash Read Write Edit Glob
---

## Project setup

- Schema: `src/lib/server/db/schema.ts`
- Migrations folder: `drizzle/` (committed to repo)
- Runtime DB: `data/local.db` (gitignored)
- Config: `drizzle.config.ts` — reads `DATABASE_URL` from env
- DB client (`src/lib/server/db/index.ts`) runs `migrate()` automatically on every boot — no manual migration step needed at runtime

## Key conventions

- `drizzle-kit generate` produces a random name like `0001_funny_animal.sql` — **always rename** it to `0001_<description>.sql` and update the matching tag in `drizzle/meta/_journal.json`
- Never run `db:push` — always use `db:generate` + `db:migrate` so migrations are tracked
- Foreign keys: pass `{ onDelete: 'cascade' }` to `.references()`
- Compound unique constraints go in the table callback: `(t) => [unique('name').on(t.col1, t.col2)]`
- Compound PKs (junction tables): `(t) => [primaryKey({ columns: [t.a, t.b] })]`
- Cutoffs stored as nullable integers; null = use app-level default
- Always set `foreign_keys = ON` and `journal_mode = WAL` pragmas on the client

## Workflow for a new migration

```bash
DATABASE_URL=./data/local.db npm run db:generate
# then rename the generated .sql file and update drizzle/meta/_journal.json tag to match
```

$ARGUMENTS
