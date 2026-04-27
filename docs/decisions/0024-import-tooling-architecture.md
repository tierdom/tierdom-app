# ADR-0024: Import Tooling Architecture

## Status

Accepted

## Context

- Roadmap: import our own export format and external sources (Goodreads, BoardGameGeek, IMDb, ...).
- Pairs with ADR-0023 (export). Same self-host constraints — single process, no workers, no external services.

## Decision

- **Registry of importers** in `src/lib/server/import/`. Adding a source = one file + one registry entry. Rejected: plugin/DI (overkill).
- **Scope: categories + items only.** Pages and site-settings stay out.
- **Identity is slug-based.** Categories match by active slug; items by slug within the resolved target. UUIDs in the file are ignored.
- **Two-step `plan` / `commit` interface.** `plan` validates and stashes; user picks a per-row mapping (Don't import / Use existing / Create new); `commit` applies.
- **Canonical published JSON Schema** at `/schemas/tierdom-import-v1.json` is the single source of truth. AJV validates against it directly. Rejected: Zod (would make the published schema a generated artifact); hand-rolled (drift risk).
- **Uploads capped at 10 MB**, stashed to `${DATA_PATH}/tmp/imports/<uuid>.json` between plan and commit. Supersedes the prior "no temp files" line — the bridge needs persistence across review.
- **Per-import strategy** (`skip` default, `overwrite`) governs item-slug clashes inside the resolved target.
- **No image imports.** `imageHash` is not copied; the hash points at files only the exporter has.
- **Stubs ship alongside the working source.** Goodreads, BoardGameGeek, IMDb render coming-soon pages. A "Suggest a new format" card invites issues for anything not listed.

## Consequences

- **Positive:** Adding a source is a small, isolated change. Published schema lets external users target our format directly.
- **Negative:** 10 MB ceiling. `overwrite` is destructive. Pages/site-settings imports are gone — separate path if needed later. Temp folder needs a sweep policy.
- **Neutral:** AJV runtime dep. Stub pages exist before their importers do.

## Coverage

|                              | Statements | Branches | Functions | Lines  |
| ---------------------------- | ---------- | -------- | --------- | ------ |
| Baseline at proposal         | 98.56%     | 95.03%   | 99.12%    | 98.59% |
| After initial implementation | 98.54%     | 93.33%   | 98.44%    | 98.71% |
| After rework                 | 98.44%     | 93.59%   | 98.57%    | 98.58% |

Remaining gaps are defensive `Error`-narrowing ternaries and one path-containment throw made unreachable by the UUID regex above it. Acceptable.
