# ADR-0010: Authentication and Authorization

## Status

Accepted

## Context

The admin (ADR-0006) is unprotected. ADR-0002 specified "single-user, session-based" auth in SvelteKit hooks but didn't prescribe an implementation.
This ADR supersedes the "single-user" assumption: the design supports a small number of admin accounts (a family, a small team) without requiring a full user-management system.

### Requirements

1. **Minimal setup.** `docker run` to secured admin in minutes; env-var-based bootstrap is acceptable.
2. **No paid services or required external deps.** Optional OAuth/OIDC integrations later are welcome but never required.
3. **No hand-rolled crypto.** Use Node's `crypto` (scrypt, SHA-256, randomBytes, timingSafeEqual) — the same primitives auth libraries call internally.
4. **Small user base, not single-user.** Schema supports multiple accounts; shared admin account acceptable in alpha.
5. **2FA is a strong nice-to-have.** TOTP deferred to Phase 2; schema reserves a `totp_secret` from day one.
6. **Lightweight server state.** SQLite-backed sessions via Drizzle. No Redis/Memcached.
7. **Idiomatic SvelteKit.** Hooks for protection, form actions for login/logout, `event.locals` for user, server-only modules for secrets.
8. **Minimal deps.** Phase 1 adds zero new npm packages.

### Scope

- **Phase 1 (in scope):** route protection, login/logout, sessions.
- **Phase 2 (deferred):** TOTP 2FA.
- **Phase 3 (deferred):** optional OAuth/SSO providers.
- **Out of scope:** public user accounts, API tokens, fine-grained RBAC, audit logging.

### Library landscape (2026)

| Library     | Status                  | Size    | Deps   | Notes                                                                                      |
| ----------- | ----------------------- | ------- | ------ | ------------------------------------------------------------------------------------------ |
| Better Auth | Active, YC-backed       | 4.34 MB | ~679   | Official SvelteKit recommendation for general-purpose apps. Drizzle + SQLite adapter. MIT. |
| Auth.js     | Maintenance-only        | 150 kB  | ~463   | Stewarded by the Better Auth team; new projects should use Better Auth.                    |
| oslo.js     | Stalled                 | Modular | 0 each | No commits in 2026. Single maintainer.                                                     |
| Lucia v3    | Deprecated (guide only) | N/A     | N/A    | Patterns remain the reference for DIY session auth.                                        |

Better Auth is well-maintained but designed for public sign-up, social login, email verification, and password reset emails — none of which Tierdom needs (1–5 admin users). Its dependency weight and schema-management opinions are disproportionate.

External proxies (Authelia, Authentik) require separate containers, conflicting with the single-image constraint (ADR-0002). Viable for advanced self-hosters; not the default path.

## Decision

**Implement session-based auth with zero new npm dependencies, following the Lucia v3 "build it yourself" pattern using Node `crypto` primitives.**

- **Hooks.** `hooks.server.ts` reads the session cookie, hashes via SHA-256, looks up the DB session, and populates `event.locals.user` / `event.locals.session`. `/admin/*` redirects to `/admin/login` if unauthenticated.
- **Login/logout** via SvelteKit form actions.
- **Tables:**
  - `user`: id (UUID), username (unique), password_hash, totp_secret (nullable), timestamps.
  - `session`: id (SHA-256 of token), user_id (FK), expires_at (Unix epoch), created_at.
- **Password hashing.** `crypto.scryptSync` (NIST-recommended, no native addons), N=16384, r=8, p=1, keyLength=64. Storage `salt$hash` hex-encoded with a 16-byte random salt per password.
- **Sessions.** Raw token in cookie; SHA-256 hash in DB (a DB leak doesn't compromise active sessions). 30-day expiry with sliding refresh when <15 days remain.
- **Bootstrap.** If no users exist on first boot and `ADMIN_PASSWORD` (and optional `ADMIN_USERNAME`) is set, create the admin account.

## Consequences

- Zero new production deps for Phase 1 — no supply-chain risk to track.
- All crypto is Node built-ins — battle-tested primitives wired together, not invented.
- Auth code is small and fully auditable.
- Hook-based design matches ADR-0006: existing admin `+page.server.ts` files don't change.
- `totp_secret` present but unused in Phase 1 — no schema migration needed for Phase 2.
- `user` table supports multiple accounts from day one. ADR-0002's "single-user" assumption is superseded.
- If requirements grow beyond DIY (public sign-up, email verification), Better Auth can be adopted in Phase 3 without rewriting Phase 1 — sessions and admin routes stay the same.

## Amendment: login rate limiting

Post-implementation security review identified brute-force as the most significant real-world risk for an internet-facing login.

In-memory rate limiter at `src/lib/server/auth/rate-limit.ts` blocks an IP after 10 failed attempts within a 1-minute window; successful login resets the counter; stale entries purge every 15 minutes. Resets on server restart — acceptable at single-process / 1–5-user scale. A SQLite-backed limiter would survive restarts but adds complexity not warranted here.
