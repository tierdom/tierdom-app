# ADR-0010: Authentication and Authorization

## Status

Investigating

## Context

The admin interface (ADR-0006) is currently unprotected.
ADR-0002 specifies "single-user, session-based" auth handled in SvelteKit hooks, but does not prescribe an implementation.
This ADR investigates concrete approaches before committing to one.

### Requirements

1. **Minimal setup friction.**
   A self-hoster with Docker should go from `docker run` to a secured admin in minutes.
   Environment-variable-based initial configuration (e.g. username/password) is acceptable and even desirable for the simplest path.

2. **No paid services or mandatory external dependencies.**
   The app must remain fully self-contained.
   Optional integrations (e.g. OAuth / OpenID Connect with Google, Microsoft, GitHub) are welcome but must not be required.

3. **No hand-rolled cryptography or session management.**
   Rely on established standards, well-maintained libraries, or framework-native primitives.

4. **Small user base, not single-user.**
   ADR-0002 assumed a single admin account.
   The design should support a small number of accounts (a family, a small team) without requiring a full user-management system.
   During alpha/beta a shared admin account is acceptable, but the data model should not preclude multiple accounts later.

5. **Two-factor authentication is a strong nice-to-have.**
   TOTP (authenticator app) support would significantly improve security for an internet-facing admin panel.
   If 2FA adds disproportionate complexity or heavy dependencies, it can be deferred --- but the architecture should not make it hard to add.

6. **Lightweight server-side state.**
   The app runs on small VPS instances.
   Avoid session stores that require Redis, Memcached, or other infrastructure.
   Cookie-based or SQLite-backed sessions are fine.

7. **Idiomatic SvelteKit.**
   Prefer approaches that work with SvelteKit hooks, form actions, and server-only modules rather than bolt-on middleware from other ecosystems.

8. **Minimal dependency footprint.**
   Fewer packages means less supply-chain risk, fewer updates to track, and a smaller image.
   Open-source (MIT / Apache-2.0 / similar) only.

### Scope

- **In scope:** admin route protection, login/logout flow, session handling, optional 2FA, optional third-party SSO.
- **Out of scope:** public-facing user accounts, API tokens, fine-grained RBAC, audit logging.

## Research questions

The following questions should be answered before a decision is made.

### 1. SvelteKit-native capabilities

- What does SvelteKit provide out of the box for auth (hooks, locals, cookies API)?
- How do existing SvelteKit projects typically implement auth without a dedicated library?

### 2. Library landscape

- What are the actively maintained, open-source auth libraries compatible with SvelteKit?
  Candidates to evaluate (non-exhaustive): Lucia, Auth.js (SvelteKit adapter), arctic, oslo.
- For each: what does it handle (sessions, OAuth, password hashing, 2FA), what is its dependency weight, and how mature/maintained is it?
- Note: Lucia announced deprecation in early 2025 but its patterns and guide remain influential --- evaluate whether its approach is viable without the library itself.

### 3. Session strategy

- Cookie-only (signed JWT or encrypted token) vs. server-side sessions (SQLite-backed) --- trade-offs for a single-process SQLite app?
- How does each approach interact with SvelteKit's `hooks.server.ts` and `event.locals`?

### 4. Password hashing and credential storage

- Which algorithms are recommended (argon2, bcrypt, scrypt) and what are their Node.js package options and native-addon implications for Alpine Docker?

### 5. TOTP two-factor authentication

- What is the minimal package set needed to support TOTP (RFC 6238)?
- Can TOTP be added as an optional layer without complicating the initial setup flow?

### 6. Third-party SSO (OAuth / OpenID Connect)

- Is it feasible to offer "Sign in with Google/Microsoft/GitHub" as an optional alternative to local credentials?
- What is the minimal package surface for OAuth 2.0 / OIDC in SvelteKit?
- How does a self-hoster configure OAuth (callback URLs, client IDs) --- is this still "minutes to set up"?
- Can local-credential auth and SSO coexist cleanly, or does supporting both double the complexity?

### 7. Comparison of integration approaches

- **Minimal custom:** SvelteKit hooks + a password-hashing library + signed cookies --- how much code, what are the risks?
- **Auth library:** Auth.js or a Lucia-inspired pattern --- what do we gain, what coupling do we accept?
- **External auth proxy:** Authelia, Authentik, or Caddy forward-auth in front of the container --- does this conflict with the single-image constraint, or is it a viable "advanced" option to document?

## Decision

Pending investigation.

## Consequences

To be determined after the research questions above are answered.
