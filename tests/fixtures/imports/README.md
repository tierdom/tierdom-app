# Import test fixtures

Hand-curated JSON files used by the import tests. Each file targets a specific scenario in the
JSON importer (`src/lib/server/import/importers/json.ts`).

| File                              | Purpose                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tierdom-json-001-good.json`      | Real export from a small dev DB. Known-good data: two pages, one site setting, two categories with items. Importing this into an empty DB should insert every row.                |
| `tierdom-json-002-overlap.json`   | Same UUIDs as 001 but every row has different content (renamed, rescored, edited). Lets tests prove `skip` leaves 001's data untouched and `upsert` overwrites it with 002's data. |
| `tierdom-json-003-malformed.json` | Schema-invalid: one item has a string `score`, another item is missing required properties. Importing must fail validation and write nothing.                                     |

Tests should treat these as immutable golden inputs — if the schema or domain model changes, regenerate via the export wizard and update the table above.
