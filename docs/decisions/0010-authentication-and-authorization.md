# ADR-0010: Authentication and Authorization

## Status

Proposed

## Context

The admin interface (ADR-0006) is currently unprotected.
ADR-0002 specifies "single-user, session-based" auth handled in SvelteKit hooks, but does not prescribe an implementation.
This ADR supersedes the "single-user" assumption in ADR-0002: the design supports a small number of admin accounts (a family, a small team) without requiring a full user-management system.

### Requirements

1. **Minimal setup friction.**
   A self-hoster with Docker should go from `docker run` to a secured admin in minutes.
   Environment-variable-based initial configuration (e.g. username/password) is acceptable and even desirable for the simplest path.

2. **No paid services or mandatory external dependencies.**
   The app must remain fully self-contained.
   Optional integrations (e.g. OAuth / OpenID Connect with Google, Microsoft, GitHub) are welcome but must not be required.

3. **No hand-rolled cryptography.**
   Rely on established standards and platform-native primitives.
   Node.js built-in `crypto` module (scrypt, SHA-256, randomBytes, timingSafeEqual) qualifies --- these are the same primitives that auth libraries call internally.

4. **Small user base, not single-user.**
   The data model supports multiple accounts.
   During alpha/beta a shared admin account is acceptable.

5. **Two-factor authentication is a strong nice-to-have.**
   TOTP (authenticator app) support is deferred to Phase 2 but the schema reserves a `totp_secret` column from day one.

6. **Lightweight server-side state.**
   SQLite-backed sessions via Drizzle ORM.
   No Redis, Memcached, or other infrastructure.

7. **Idiomatic SvelteKit.**
   SvelteKit hooks for route protection, form actions for login/logout, `event.locals` for request-scoped user data, server-only modules for secrets.

8. **Minimal dependency footprint.**
   Phase 1 adds zero new npm packages.
   All cryptography uses Node.js built-in `crypto`.

### Scope

- **In scope (Phase 1):** admin route protection, login/logout flow, session handling.
- **In scope (Phase 2, deferred):** TOTP two-factor authentication.
- **In scope (Phase 3, deferred):** optional OAuth / SSO providers.
- **Out of scope:** public-facing user accounts, API tokens, fine-grained RBAC, audit logging.

### Research findings

#### SvelteKit-native capabilities

SvelteKit provides all the building blocks for auth without a dedicated library:

- `hooks.server.ts` `handle` function runs on every request --- validate session cookies and populate `event.locals`.
- `event.cookies` API with secure defaults (httpOnly, secure on production, sameSite: lax).
- Form actions for login/logout mutations.
- Server-only modules (`$lib/server/`) for secrets and auth logic.

#### Library landscape (2026)

| Library     | Status                  | Size    | Deps   | Notes                                                                                      |
| ----------- | ----------------------- | ------- | ------ | ------------------------------------------------------------------------------------------ |
| Better Auth | Active, YC-backed       | 4.34 MB | ~679   | Official SvelteKit recommendation for general-purpose apps. Drizzle + SQLite adapter. MIT. |
| Auth.js     | Maintenance-only        | 150 kB  | ~463   | Being stewarded by Better Auth team. New projects should use Better Auth.                  |
| oslo.js     | Stalled                 | Modular | 0 each | No commits in 2026. Single maintainer (pilcrowonpaper).                                    |
| Lucia v3    | Deprecated (guide only) | N/A     | N/A    | Patterns remain the reference for DIY session auth.                                        |

Better Auth is well-maintained and feature-rich but designed for apps with public sign-up flows, social login, email verification, and password reset emails.
Tierdom needs none of that --- it protects an admin panel for 1--5 users.
The dependency weight and schema-management opinions of Better Auth are disproportionate to the need.

#### Password hashing

Node.js built-in `crypto.scryptSync` is NIST-recommended and works on Alpine Docker without native addons.
Parameters: N=16384, r=8, p=1, keyLength=64 bytes.
Storage format: `salt$hash` (both hex-encoded), 16-byte random salt per password.

#### Session strategy

SQLite-backed sessions with a raw token in the cookie and its SHA-256 hash in the database.
A database leak does not compromise active sessions.
30-day expiry with sliding window refresh (extend when less than 15 days remain).

#### External auth proxies

Authelia and Authentik require separate containers, conflicting with the single-image constraint (ADR-0002).
They remain a viable option for advanced self-hosters who already run a reverse proxy --- but not the default path.

## Decision

**Implement session-based auth using zero new npm dependencies, following the Lucia v3 "build it yourself" pattern with Node.js built-in `crypto` primitives.**

### Architecture

```
Request
  → hooks.server.ts (read session cookie → SHA-256 → DB lookup)
  → event.locals.user / event.locals.session populated
  → /admin/* routes: redirect to /admin/login if unauthenticated
  → form actions for login/logout (SvelteKit-native)
```

### Database tables

- `user`: id (UUID), username (unique), password_hash, totp_secret (nullable), timestamps.
- `session`: id (SHA-256 of token), user_id (FK), expires_at (Unix epoch), created_at.

### Setup flow

1. Self-hoster sets `ADMIN_PASSWORD` (and optional `ADMIN_USERNAME`) environment variable.
2. On first boot, if no users exist, the app creates an admin account with the hashed password.
3. Admin logs in at `/admin/login`.

### Phased rollout

- **Phase 1:** password login + sessions + route protection (this ADR).
- **Phase 2:** TOTP two-factor authentication (separate ADR when implemented).
- **Phase 3:** optional OAuth SSO providers (separate ADR when implemented).

## Consequences

- Zero new production dependencies for Phase 1.
  No supply-chain risk, no package updates to track.
- All cryptographic primitives are Node.js built-ins (scrypt, SHA-256, timingSafeEqual, randomBytes).
  Battle-tested by millions of applications.
  Not hand-rolled --- we wire established primitives, not implement them.
- Total auth code is ~150 lines, fully auditable.
- The hook-based approach matches ADR-0006's design: admin routes remain auth-agnostic.
  Adding auth does not modify any existing admin `+page.server.ts` file.
- The `totp_secret` column is present but unused in Phase 1, avoiding a schema migration for Phase 2.
- The `user` table supports multiple accounts from day one.
  ADR-0002's "single-user" assumption is superseded.
- If requirements grow beyond what DIY auth can handle (e.g. public sign-up, email verification), Better Auth can be adopted for Phase 3 without rewriting Phase 1 --- the session table and admin routes stay the same.

## Amendment: login rate limiting

A post-implementation security review identified brute-force attacks as the most significant real-world risk for an internet-facing login page.

**Added:** in-memory rate limiter (`src/lib/server/auth/rate-limit.ts`) that blocks an IP after 10 failed login attempts within a 1-minute window.
On successful login, the counter resets.
Stale entries are purged automatically every 15 minutes to prevent memory growth.

This is deliberately simple: in-memory state resets on server restart, which is acceptable for a single-process app with 1--5 users.
A persistent (SQLite-backed) rate limiter would survive restarts but adds complexity that is not warranted at this stage.
