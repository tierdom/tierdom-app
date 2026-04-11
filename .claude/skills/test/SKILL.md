---
name: test
description: Run E2E and unit tests. Supports smoke tests (quick, any DB), deterministic tests (seeded DB, full suite), or individual test files.
allowed-tools: Bash Read
---

Run tests for the Tierdom project.

## Quick reference

| What              | Command                                                                                     | Notes                                   |
| ----------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| E2E smoke         | `npx playwright test --project=smoke`                                                       | Requires dev server on :5173            |
| E2E deterministic | `npm run test:e2e:reset && npx playwright test --project=det-setup --project=deterministic` | Resets DB, builds, runs against preview |
| Single test file  | `npx playwright test <path> --project=<smoke\|deterministic>`                               | Run one file                            |
| Unit tests        | `npm run test:unit -- --run`                                                                | Fast, no browser                        |
| All tests         | `npm test`                                                                                  | Unit + all E2E                          |
| Show last report  | `npx playwright show-report`                                                                | Opens HTML report                       |

## When to use what

- **During development (quick check):** Run smoke tests. They work against the running dev server with any database state.
- **Before merging / after schema changes:** Run deterministic tests. They reset the DB, seed fresh data, and verify everything against known state.
- **After changing a single feature:** Run the relevant individual test file.

## Test layout

```
tests/e2e/
  smoke/               # Database-agnostic tests (dev server :5173)
  deterministic/       # Seeded-database tests (preview :4173)
  fixtures/auth.ts     # Shared login helper
```

## Debugging failures

1. Re-run with trace: `npx playwright test --trace on <path>`
2. Use the Playwright MCP tools (`browser_navigate`, `browser_snapshot`) for interactive debugging against the dev server.

## Database isolation

- Deterministic tests use an **isolated database** at `./test-data/db.sqlite` (configured via `.env.test`). They never touch the dev database in `./data/db.sqlite`. All test artifacts (database, images, auth state) live in the gitignored `test-data/` directory.
- `npm run test:e2e:reset` resets only the test database, runs migrations, and seeds it (admin/admin, 5 categories, ~108 items, 10 tags, 2 pages).
- Smoke tests run against the dev server and use whatever database is already there.

## Writing tests

- **Public over admin:** Public-facing pages are the product surface — prioritize their test coverage. If admin breaks, it can wait for a fix; if public breaks, visitors see it immediately.
- **Readable fixtures:** Test images and fixture files should be visually recognizable (e.g. 100×100 with "TEST IMG" label), not minimal 1×1 stubs. Playwright screenshots and recordings are reviewed by humans.

$ARGUMENTS
