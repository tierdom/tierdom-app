# ADR-0023: Export Tooling — Streaming ZIP Architecture (fflate)

## Status

Proposed

## Context

- New `/admin/tools/export`: admin downloads a ZIP with optional SQLite snapshot, structured JSON (pages + site settings + categories with nested items), and item images.
- Self-host constraint (ADR-0002, ADR-0012): one image, one process, no external services.
- "Backup" (persisted artifacts, retention, scheduling) is a separate future epic that will reuse the builder defined here.

## Decision

### Generation & delivery

- **Stream-on-demand.** SvelteKit `+server.ts` GET returns `new Response(stream)` where `stream` is a `ReadableStream` fed by `fflate`'s `Zip` callback. No persisted artifact.
- Rejected: sync-build-to-disk (defer to Backup epic), async-job-with-polling (overkill at single-admin scale), external workers (violates self-host).

### ZIP packaging

- Library: **`fflate`** (zero runtime deps, ~50 KB Node footprint, MIT). Per-entry `ZipPassThrough` (store) for already-compressed WebPs; `ZipDeflate` (level 6) for SQLite + JSON.
- Rejected: `archiver` — nicer API but ~15 transitive deps (legacy `readable-stream` dual-versioning, `abort-controller` polyfill); supply-chain surface conflicts with the self-hostable / minimal-dep principle. Hand-rolled `zlib` — Node ships the building blocks but not the ZIP container; ~300 LOC of binary-format code with edge cases (UTF-8 filenames, ZIP64, DOS timestamps) is a perpetual tax for no real win.
- Layout (top-level dated folder avoids tar-bomb UX):
  ```
  tierdom-backup-YYYY-MM-DD/
    README.txt          # restore hints
    manifest.json       # {schemaVersion, appVersion, exportedAt, contents, counts}
    db/db.sqlite        # if SQLite selected
    data.json           # if JSON selected
    images/<hash>.webp  # if images selected
  ```

### SQLite snapshot

- **`VACUUM INTO`** to `os.tmpdir()`, added to archive, unlinked in `finally`.
- Rejected: file copy (misses WAL writes), checkpoint-then-copy (race-prone).

### `data.json` schema

- Top-level `{ schemaVersion: 1, appVersion, exportedAt, data }`. Integer version; future importer dispatches on it.
- Includes `pages`, `siteSettings`, `categories` with `items` nested. FK-safe order.
- Excludes soft-deleted rows (uses `*_active` views per ADR-0022) and `user`/`session` tables.
- Stable IDs preserved. ISO-8601 timestamps. Image references by hash filename.

### Wizard UX

- Three checkboxes (SQLite / JSON / Images) + disabled "Markdown" placeholder.
- SQLite checkbox notes "includes trash"; JSON checkbox warns "excludes trash".
- Submit: native `<form method="GET">` to the streaming endpoint. No JS required.

### Auth

- `/admin/*` redirect in `src/hooks.server.ts` already gates the endpoint.

### Builder reuse

- Logic factored into `src/lib/server/export/build-export.ts` as `buildExport(opts)` so the future Backup epic can call it without HTTP.

## Consequences

- **Positive:** No job table, no worker, no cleanup cron. Works without JS. Browser shows native download progress. Builder reusable for Backup. Versioned JSON gives importers a clean contract.
- **Negative:** No resumable downloads — dropped connection re-runs from scratch. No in-app export history. No progress UI beyond browser-native.
- **Neutral:** Adds `fflate` dep (zero transitive deps). Adds `backupDatabaseTo(path)` helper. Trash lives only in the SQLite snapshot, not JSON — surfaced explicitly in the wizard. Slightly more glue code than `archiver` would need (mixed sources via per-entry `ZipDeflate` / `ZipPassThrough` streams) — one-time cost.
