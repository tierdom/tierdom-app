# ADR-0023: Export Tooling — Streaming ZIP Architecture (fflate)

## Status

Accepted

## Context

- New `/admin/tools/export`: admin downloads a ZIP with optional SQLite snapshot, structured JSON (pages + site settings + categories with nested items), and item images.
- Self-host constraint (ADR-0002, ADR-0012): one image, one process, no external services.
- "Backup" (persisted artifacts, retention, scheduling) is a separate future epic that will reuse the builder defined here.

## Decision

### Generation & delivery

- **Stream-on-demand.** SvelteKit `+server.ts` GET returns `new Response(stream)` where `stream` is a `ReadableStream` fed by `fflate`'s `Zip` callback. No persisted artifact.
- Rejected: sync-build-to-disk (defer to Backup epic), async-job-with-polling (overkill at single-admin scale), external workers (violates self-host).

### ZIP packaging

- Library: **`fflate@0.8.2`** (zero runtime deps, MIT). Per-entry `ZipPassThrough` (store) for WebPs; `ZipDeflate` (level 6) for SQLite + JSON.
- Rejected: `archiver` (~15 transitive deps — supply-chain surface conflicts with self-hostable principle); hand-rolled `zlib` (Node ships deflate but not the ZIP container — perpetual tax).
- Filename + inner folder include time, colons stripped: `tierdom-backup-YYYY-MM-DDTHH-MM-SSZ`. Entries sorted by path for deterministic output.
- Layout (top-level dated folder avoids tar-bomb UX):
  ```
  tierdom-backup-YYYY-MM-DDTHH-MM-SSZ/
    README.txt          # always — static asset, documents all options
    manifest.json       # always — {schemaVersion, appVersion, exportedAt, contents, counts}
    db/db.sqlite        # if SQLite selected
    data.json           # if JSON selected
    images/<hash>.webp  # if images selected
  ```
- `README.txt` is a checked-in static asset embedded via Vite `?raw` — documents all options regardless of which were ticked, so the wizard UI and the archive can't drift apart.

### SQLite snapshot

- **`VACUUM INTO`** via a `backupDatabaseTo` helper in `db/index.ts`. Snapshot in `os.tmpdir()` with a UUID name, unlinked in `finally` + `cancel` (idempotent).
- Rejected: file copy (misses WAL writes), checkpoint-then-copy (race-prone).
- Accepted trade-off: tmpdir may be on a different volume than `$DATA_PATH` in Docker — one extra copy per export. Fine at our scale.

### `data.json` schema

- Top-level `{ schemaVersion: 1, appVersion, exportedAt, data }`. Integer version; future importer dispatches on it.
- Includes `pages`, `siteSettings`, `categories` with `items` nested. FK-safe order.
- Excludes soft-deleted rows (uses `*_active` views per ADR-0022) and `user`/`session` tables.
- Stable IDs preserved. ISO-8601 timestamps. Image references by hash filename.

### Wizard UX

- Three checkboxes (SQLite / JSON / Images) + disabled "Markdown" placeholder.
- SQLite checkbox notes "includes trash"; JSON checkbox warns "excludes trash".
- Submit: native `<form method="GET">` to the streaming endpoint. No JS required.

### Auth & input safety

- `/admin/*` redirect in `hooks.server.ts` already gates the endpoint. Endpoint returns `400` if all checkboxes are off.
- Image filenames filtered through `/^[A-Za-z0-9_-]{1,128}\.webp$/` — defense-in-depth against zip-slip on extraction (a `..`-containing name would otherwise produce a dangerous entry path).
- Symlinks in `$DATA_PATH/images/` are excluded automatically — `Dirent.isFile()` doesn't follow them.

### Builder reuse

- Pure `buildExport(opts, ctx, db?)` in `src/lib/server/export/build-export.ts` returns `{ stream, filename, cleanup }`. No SvelteKit/HTTP imports — the future Backup epic can call it directly. Test overrides for `exportedAt` and `imagesDir` live in `ctx`.

### App version

- `package.json` is the single source of truth; `app-version.ts` reads it once at startup and stamps every manifest. `scripts/publish.sh` derives the Docker tag from it and refuses to publish from a dirty tree. Workflow: `npm version prerelease --preid=alpha` → `./scripts/publish.sh` → `git push --tags`.

## Consequences

- **Positive:** No job table, no worker, no cleanup cron. Works without JS. Browser shows native download progress. Builder reusable for Backup. Versioned JSON gives importers a clean contract.
- **Negative:** No resumable downloads — dropped connection re-runs from scratch. No in-app export history. No progress UI beyond browser-native.
- **Neutral:** Adds `fflate` dep (zero transitive deps). Adds `backupDatabaseTo(path)` helper. Trash lives only in the SQLite snapshot, not JSON — surfaced explicitly in the wizard. Slightly more glue code than `archiver` would need (mixed sources via per-entry `ZipDeflate` / `ZipPassThrough` streams) — one-time cost.
