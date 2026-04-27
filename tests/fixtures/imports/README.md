# Import test fixtures

Hand-curated JSON files used by the import tests. Each file targets a specific scenario in the
JSON importer (`src/lib/server/import/importers/json.ts`).

| File                              | Purpose                                                                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tierdom-json-001-good.json`      | Canonical happy-path: categories with items only (no pages, no site settings). The "import looks like a tier list import" baseline most users will hit.                                                                       |
| `tierdom-json-002-overlap.json`   | Same UUIDs as 001 but every row has different content (renamed, rescored, edited). Lets tests prove `skip` leaves 001's data untouched and `upsert` overwrites it with 002's data.                                            |
| `tierdom-json-003-malformed.json` | Schema-invalid: one item has a string `score`, another item is missing required properties. Importing must fail validation and write nothing.                                                                                 |
| `tierdom-json-004-full.json`      | Same categories/items as 001 plus pages and site settings — the "kitchen sink" fixture for exercising the page and site-setting code paths (including the site-content cache invalidation that runs after a successful write). |

Tests should treat these as immutable golden inputs — if the schema or domain model changes, regenerate via the export wizard and update the table above.
