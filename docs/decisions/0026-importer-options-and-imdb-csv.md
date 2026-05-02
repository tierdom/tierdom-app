# ADR-0026: Importer Options Framework + IMDb CSV

## Status

Proposed

## Context

- ADR-0024 set up the importer registry with `plan` → review → `commit`. No way to configure per-importer behaviour.
- IMDb CSV needs six knobs: `importYear`, `importDirectors`, `titleType` (all/movie/tv-series), `importUrl`, `sortBy`, `unratedRows`. Future sources (Goodreads, BGG, StoryGraph) will want similar.
- Building the knobs into `imdb.ts` only would force every next importer to invent its own UI.

## Decision

- **Generic options schema on `Importer`.** Checkbox + radio variants only — no free text, no nested groups. Renderer reads the schema and produces a `<ConfigureForm>`. Rejected: ad-hoc per-importer Svelte components (drift), JSON Schema (overweight for two control types).
- **New `configure` phase** between upload and plan. Skipped when `importer.options` is absent — Tierdom JSON path unchanged.
- **Options pass through `plan(file, options)`** and are stashed alongside the parsed payload in temp storage so `commit` can see them too.
- **CSV parsing via `papaparse`.** Quoted comma-bearing fields (genre lists, director lists) are common; hand-rolled split is a footgun. Rejected: `csv-parse` (heavier), manual.
- **IMDb model fit:** one synthetic category per import (`imdb-watchlist` / `movies` / `tv-series` based on `titleType`); `Title` → name + slug; `Your Rating × 10` → score; `Year`/`Directors` as item props; URL as `[IMDB Link for '<Title>'](URL)` in description; `Const` as final tie-breaker for stable order.
- **Score range:** rating `1-10` mapped as if `0-10` (so `1` → `10`, not `0`). User-stated.
- **Fixture is committed and deterministically generated** by `scripts/cherry-pick-imdb-sample.ts` from a gitignored real export. No LLM in the loop.

## Consequences

- **Positive:** New importers add a `options` array + a parser; UI is free. Tierdom JSON unaffected.
- **Negative:** Two control types only — anything richer (number range, multi-select) needs a schema extension first. Options are stringly-typed in form data; per-importer parsing required.
- **Neutral:** `papaparse` becomes a runtime dep. `MAX_JSON_BYTES` generalises to a per-importer cap (or shared `MAX_FILE_BYTES`).

## Coverage

Svelte components and route files are not currently in coverage scope; only `src/lib/**/*.ts` is measured. The numbers below are for that scope.

|                      | Statements | Branches | Functions | Lines  |
| -------------------- | ---------- | -------- | --------- | ------ |
| Baseline at proposal | 98.45%     | 93.78%   | 98.57%    | 98.60% |

Files this ADR will touch (current): `import/types.ts` 100/100, `registry.ts` 100/100, `temp-storage.ts` 97.61/95.45, `validate.ts` 100/100, `slugify.ts` 100/100, `importers/imdb.ts` 100/100 (stub — trivial), `importers/tierdomJson.ts` 100/90.
