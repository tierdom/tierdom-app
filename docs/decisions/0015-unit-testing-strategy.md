# ADR-0015: Unit Testing Strategy

## Status

Accepted

## Context

The roadmap calls for "significant unit test coverage where sensible."
ADR-0014 established a two-tier Playwright E2E strategy that covers user journeys well, but E2E tests are expensive for exercising combinatorial edge cases in pure logic (tier boundary math, time-dependent formatting, rate-limit windowing).

Vitest 4.1.0 is already configured in `vite.config.ts` with a `server` project (node environment, `src/**/*.{test,spec}.{js,ts}`), but no test files exist yet.

The question is: what deserves a unit test versus being left to E2E, and should we add Svelte component testing infrastructure?

## Decision

### Scope: pure and near-pure functions only

Unit test functions where combinatorial inputs, boundary conditions, or time-dependence make E2E coverage impractical:

| Module                              | Functions                        | Rationale                                             |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `src/lib/tier.ts`                   | `scoreToTier`, `scoreToBarColor` | 7 tier boundaries with custom cutoff overrides        |
| `src/lib/server/slugify.ts`         | `slugify`                        | Unicode, edge cases, never directly visible in E2E    |
| `src/lib/format-date.ts`            | `formatRelativeDate`             | 6 time branches, requires fake timers for determinism |
| `src/lib/server/auth/password.ts`   | `hashPassword`, `verifyPassword` | Crypto contract: roundtrip, format, salt uniqueness   |
| `src/lib/server/auth/session.ts`    | `hashToken`                      | Pure SHA-256 wrapper, pin the contract                |
| `src/lib/server/auth/rate-limit.ts` | `createRateLimiter` API          | Stateful + time-windowed, impractical via browser     |

### Explicitly out of scope

- **DB-coupled functions** (`reorder.ts`, `session.ts` CRUD, `tags.ts`) — mocking Drizzle's query builder would replicate the implementation. Covered by deterministic E2E.
- **`markdown.ts`** — thin glue around marked + DOMPurify with module-scope side effects. Needs a DOM environment. Covered by E2E.
- **`images.ts`** — depends on sharp (native binary), filesystem, and `$env`. Covered by E2E upload tests.
- **Svelte component tests** — the project's components are presentation-only (prop-to-CSS mappings, conditional rendering). Adding `@testing-library/svelte` + jsdom/happy-dom + a second vitest project is not justified given E2E coverage. Revisit when components gain non-trivial client-side logic.

### Test file placement

Colocated next to source files, matching the existing vitest glob pattern.
E2E tests remain in `tests/e2e/` per ADR-0014.

### Test techniques

- **Fake timers** (`vi.useFakeTimers`) for `formatRelativeDate` and rate-limit window expiry.
- **Dynamic import** for rate-limit module to ensure `setInterval` cleanup timer uses fake timers.
- **Module mock** (`vi.mock('$lib/server/db')`) for `hashToken` test to prevent DB initialization on import.
- **No new dependencies** required — vitest is already installed and configured.

## Consequences

- Pure logic gets thorough boundary/edge-case coverage that would be impractical through E2E.
- No new dependencies or infrastructure — the existing vitest config supports all planned tests.
- Component testing infrastructure is deferred, avoiding premature complexity.
- DB-coupled logic remains tested only at the E2E level — acceptable given the deterministic test suite seeds and exercises these code paths.
- `npm run test` continues to run both unit and E2E tests in sequence.
