# ADR-0014: End-to-End Testing Strategy

## Status

Accepted

## Context

No tests exist yet.
The roadmap calls for "a few end-to-end test cases for safety."
The AI-assisted development workflow demands fast, frequent test runs — tests will be executed often, sometimes after every significant change.
Two distinct use cases have emerged:

1. **Quick smoke checks** during active development, verifying that the app still works with whatever database state happens to exist.
2. **Full deterministic validation** against a freshly seeded database, suitable for CI/CD and pre-merge confidence.

Playwright 1.58.2 is already installed and minimally configured.
The app uses SQLite (single-writer), which constrains parallel test execution.

## Decision

Adopt a **two-tier Playwright E2E strategy** with two Playwright projects:

### Smoke tests (`smoke` project)

- Run against the dev server on port 5173 (assumes it is already running).
- Assert only on structural invariants: pages load, auth redirects work, health endpoint responds.
- Make no assumptions about specific database content.
- Fast to run — no build step, no database reset.

### Deterministic tests (`deterministic` project)

- Run against the preview server on port 4173 (production build).
- Expect a freshly seeded database (`npm run test:e2e:reset`).
- Assert on exact seed data: category names, item counts, tier assignments.
- Include full CRUD cycles that create, verify, edit, and delete their own data.
- Use Playwright's `storageState` to log in once and share the session across all admin tests.

### Other decisions

- **Single browser (Chromium)** — keeps the suite fast. Add Firefox/Safari only if cross-browser bugs surface.
- **No E2E in pre-commit hook** — the current `npm run lint` hook stays. E2E is too slow for the frequent commit cadence of an AI-assisted workflow.
- **`workers: 1` in CI** — SQLite's single-writer constraint means parallel admin CRUD tests could cause `SQLITE_BUSY`.
- **`/test` Claude Code skill** — a purpose-built skill so AI agents know when and how to run each test category.
- **Isolated test database** — deterministic tests use `DATA_PATH=./test-data` (via `.env.test`) so they never touch the dev database in `./data/`. All test artifacts (database, images, auth state) live in the gitignored `test-data/` directory.

### Test directory layout

```
tests/e2e/
  fixtures/auth.ts             # loginAsAdmin helper
  smoke/                       # database-agnostic tests
  deterministic/               # seeded-database tests
test-data/                     # gitignored — test DB, images, auth state
```

## Consequences

- Tests run frequently during development without friction (smoke: ~5s, deterministic: ~30s).
- Deterministic tests catch regressions against known data with high confidence.
- Smoke tests enable rapid verification without database setup.
- CI/CD can run deterministic tests with `workers: 1` to avoid SQLite contention.
- No cross-browser coverage yet — acceptable for an early-alpha self-hosted app.
- Test files live outside `src/` to keep application code separate from test infrastructure.
