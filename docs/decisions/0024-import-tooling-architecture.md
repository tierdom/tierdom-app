# ADR-0024: Import Tooling Architecture

## Status

Accepted

## Context

- Roadmap: import our own export format and external sources (Goodreads, BoardGameGeek, IMDb, ...).
- Pairs with ADR-0023 (export). Same self-host constraints — single process, no workers, no external services.

## Decision

- **Registry of importers** in `src/lib/server/import/`. Adding a source = one file + one registry entry. Rejected: plugin/DI (overkill).
- **Tierdom JSON importer is restore-shaped, not merge-shaped.** Identity is UUID; conflicts on slug are skipped, never silently merged. The "I have a Books category and want to bulk-add items from another source" flow is a follow-up that should land per-source as target-aware importers (Goodreads/BGG/IMDb), not by extending Tierdom JSON.
- **Canonical published JSON Schema** at `/schemas/tierdom-import-v1.json` is the single source of truth for the format. AJV validates against it directly. Rejected: Zod (would make the published schema a generated artifact); hand-rolled (drift risk).
- **Uploads in memory, capped at 10 MB.** No temp files, no housekeeping job. Larger imports are a future feature branch.
- **Per-import merge strategy** (`skip` default, `upsert`) chosen on the form. Applied within a single Drizzle transaction.
- **Stubs ship alongside the working source.** Goodreads, BoardGameGeek, IMDb render coming-soon pages. A "Suggest a new format" card on the index invites issues for anything not listed.
- **No image imports** in this round.

## Consequences

- **Positive:** Adding a source is a small, isolated change. The published schema lets external users target our format directly.
- **Negative:** 10 MB ceiling. `upsert` is destructive (surfaced explicitly in the form). The merge use case is not solved — needs the per-source target-aware importers.
- **Neutral:** Adds AJV runtime dep. Stub pages exist before their importers do.

## Coverage

|                      | Statements | Branches | Functions | Lines  |
| -------------------- | ---------- | -------- | --------- | ------ |
| Baseline at proposal | 98.56%     | 95.03%   | 99.12%    | 98.59% |
| After implementation | 98.54%     | 93.33%   | 98.44%    | 98.71% |

The branch dip is concentrated in defensive `Error`/null-coalescing fallbacks in the importer; statements and lines are flat. Acceptable.
