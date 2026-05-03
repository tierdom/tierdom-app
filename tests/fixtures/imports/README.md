# Import test fixtures

Hand-curated JSON files used by the import tests. Each file targets a specific scenario in the
Tierdom JSON importer (`src/lib/server/import/importers/tierdomJson.ts`) and the published JSON
Schema (`src/lib/server/import/schema-v1.json`).

| File                              | Purpose                                                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tierdom-json-001-good.json`      | Canonical happy-path: categories with items only (no pages, no site settings). The "import looks like a tier list import" baseline most users will hit.                                                                                              |
| `tierdom-json-002-overlap.json`   | Same content as 001 but with edited names/scores and pages + site settings. Lets schema-validation tests prove the validator accepts a more elaborate payload, and acts as a stand-in source when a test wants overlapping data without rewriting 001. |
| `tierdom-json-003-malformed.json` | Schema-invalid: one item has a string `score`, another item is missing required properties. Importing must fail validation in the plan phase and write nothing to the database or to the temp store.                                                |
| `tierdom-json-004-full.json`      | Kitchen-sink fixture — categories/items plus pages and site settings — for the schema round-trip test (`schema-v1.test.ts`). The importer ignores the page and site-setting branches; this fixture simply proves the schema accepts the full export shape. |
| `imdb-sample.csv`                 | Sample of an IMDb ratings export from a real user. Hand-picked set of rows to be an interesting, representable test-set covering a range of options. |
| `imdb-malformed.csv`              | Hand-crafted CSV with big errors. Importing must produce a plan-level header error and write nothing.                                                                                                                                                                                                                |
| `goodreads-sample.csv`            | Hand-curated 21-row sample of a Goodreads "My Books" CSV export from a real user. Covers rated and unrated rows, multiple bindings, both ISBN columns (with Goodreads' `="..."` Excel-armoured quoting), and a mix of original/edition publication years. |
| `goodreads-malformed.csv`         | Hand-crafted CSV missing several required Goodreads columns. Importing must produce a plan-level header error and write nothing.                                                                                                                                                                                                                |

Tests should treat these as immutable golden inputs — if the schema or domain model changes,
regenerate via the export wizard and update the table above.
