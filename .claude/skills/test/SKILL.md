---
name: test
description: Run E2E and unit tests. Supports smoke tests (quick, any DB), deterministic tests (seeded DB, full suite), unit tests, or individual test files. Also covers ad-hoc verification via Playwright MCP.
allowed-tools: Bash Read mcp__playwright__browser_navigate mcp__playwright__browser_snapshot mcp__playwright__browser_click mcp__playwright__browser_fill_form mcp__playwright__browser_evaluate mcp__playwright__browser_console_messages mcp__playwright__browser_network_requests mcp__playwright__browser_take_screenshot mcp__playwright__browser_press_key mcp__playwright__browser_select_option mcp__playwright__browser_wait_for mcp__playwright__browser_tabs
---

Run tests for the Tierdom project.

## Quick reference

| What              | Command                                                                                     | Notes                                   |
| ----------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| Unit tests        | `npm run test:unit -- --run`                                                                | ~1s, no browser, no DB                  |
| Single unit file  | `npx vitest run src/lib/server/slugify.test.ts`                                             | Run one unit test file                  |
| E2E smoke         | `npx playwright test --project=smoke`                                                       | Requires dev server on :5173            |
| E2E deterministic | `npm run test:e2e:reset && npx playwright test --project=det-setup --project=deterministic` | Resets DB, builds, runs against preview |
| Single E2E file   | `npx playwright test <path> --project=<smoke\|deterministic>`                               | Run one E2E file                        |
| All tests         | `npm test`                                                                                  | Unit + all E2E                          |
| Show last report  | `npx playwright show-report`                                                                | Opens HTML report                       |

## When to use what

- **After changing pure logic (scoring, slugify, validation, etc.):** Run unit tests. They are fast and run in the pre-commit hook already.
- **After UI-visible changes (quick check):** Run smoke tests. They work against the running dev server with any database state. This includes axe-core accessibility checks.
- **Before merging / after schema changes:** Run deterministic tests. They reset the DB, seed fresh data, and verify everything against known state. This includes axe-core accessibility checks for all public and admin pages.
- **After creating or modifying a single feature:** Use ad-hoc verification (see below) or run the relevant individual test file.

## Ad-hoc verification via Playwright MCP

For quick, targeted verification of a feature you just built or changed, use the Playwright MCP tools directly against the dev server at `http://localhost:5173` instead of running a full test suite.
This is ideal for:

- Verifying a new UI component renders correctly
- Checking that a form submits and redirects as expected
- Confirming a bug fix works visually
- Spot-checking a page after a refactor

**Workflow:**

1. `browser_navigate` to the relevant page on `http://localhost:5173`
2. `browser_snapshot` to inspect the current DOM state
3. Interact as needed (`browser_click`, `browser_fill_form`, `browser_press_key`, etc.)
4. Verify the result with another `browser_snapshot` or `browser_evaluate`

If the dev server is not running, ask the user to start it.
This does **not** replace writing proper tests — it supplements them for fast feedback during development.

## Test layout

```
src/lib/**/*.test.ts       # Unit tests (colocated with source)
tests/e2e/
  smoke/                   # Database-agnostic E2E tests (dev server :5173)
  deterministic/           # Seeded-database E2E tests (preview :4173)
  fixtures/auth.ts         # Shared login helper
```

## Debugging failures

1. Re-run with trace: `npx playwright test --trace on <path>`
2. Use the Playwright MCP tools (`browser_navigate`, `browser_snapshot`) for interactive debugging against the dev server.

## Database isolation

- Deterministic tests use an **isolated database** at `./test-data/db.sqlite` (configured via `.env.test`). They never touch the dev database in `./data/db.sqlite`. All test artifacts (database, images, auth state) live in the gitignored `test-data/` directory.
- `npm run test:e2e:reset` resets only the test database, runs migrations, and seeds it (admin/admin, 5 categories, ~108 items, 10 tags, 2 pages).
- Smoke tests run against the dev server and use whatever database is already there.
- Unit tests use no database at all.

## Writing tests

- **Unit tests** go next to their source file (`foo.ts` → `foo.test.ts`). Test pure functions and near-pure logic. See ADR-0015 for scope decisions.
- **Public over admin:** Public-facing pages are the product surface — prioritize their E2E test coverage. If admin breaks, it can wait for a fix; if public breaks, visitors see it immediately.
- **Readable fixtures:** Test images and fixture files should be visually recognizable (e.g. 100×100 with "TEST IMG" label), not minimal 1×1 stubs. Playwright screenshots and recordings are reviewed by humans.

$ARGUMENTS
