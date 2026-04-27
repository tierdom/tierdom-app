# ADR-0024: Import Tooling Architecture

## Status

Proposed

## Context

- Roadmap calls for importing our own export format and external sources (Goodreads, BoardGameGeek, IMDb, ...).
- Pairs with ADR-0023 (export). Same self-host constraints — single process, no workers, no external services.
- Want a layout where adding a new source is a small, isolated change.

## Decision

### Architecture

- Importers live under `src/lib/server/import/importers/`. A flat array in `src/lib/server/import/registry.ts` is the registry.
- Adding a source = one file + one registry entry.
- Rejected: plugin/DI architecture (overkill for in-process self-hosted app).

### Sources in this round

- **Available:** JSON round-trip of our own export.
- **Stubs (coming-soon pages):** Goodreads, BoardGameGeek, IMDb, plus a generic "your format" entry pointing at the published schema.

### Schema & validation

- `src/lib/server/import/schema-v1.json` (served at `/schemas/tierdom-import-v1.json`) is the canonical published spec — single source of truth.
- AJV validates against it directly.
- Rejected: Zod (would make published schema a generated artifact); hand-rolled validator (drift risk).

### Uploads

- 10 MB cap, parsed in memory. No temp files, no housekeeping job.
- Larger imports deferred to a future feature branch.
- No image imports in this round.

### Merge strategy

- Per-import choice on the upload form: `skip` existing UUIDs (default) or `upsert`.
- Applied within a single Drizzle transaction; partial failures roll back.

## Consequences

- **Positive:** New sources are isolated additions. Published JSON Schema lets external users wrangle arbitrary data into our format. No cleanup cron.
- **Negative:** 10 MB ceiling; bigger libraries need future work. `upsert` is destructive — surfaced explicitly in the form.
- **Neutral:** Adds AJV runtime dep. Stub pages ship before their importers exist.

## Coverage

Baseline at proposal: **98.56% stmts / 95.03% branches / 99.12% funcs / 98.59% lines**. Expectation: hold or improve. New code under `src/lib/server/import/**` ships with coverage ≥ 95% across the board.
