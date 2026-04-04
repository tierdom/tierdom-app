# ADR-0002: System Architecture

## Status

Accepted

## Context

tierdom-pro needs to be self-hostable by a non-technical user on a bare VPS with minimal setup. It has two distinct sides — a public read-only site and a private admin back-office — but should ship as a single deployable unit. The database must be easy to back up without special tooling. The Docker image should be as small as possible to reduce download time and attack surface.

## Decision

**Single-process, single-image full-stack application.**

| Concern    | Choice                     | Rationale                                                                                                     |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework  | SvelteKit (TypeScript)     | Smallest compiled JS bundle, excellent SSR, low boilerplate, handles both frontend and backend in one process |
| Database   | SQLite via Drizzle ORM     | File-based, zero infrastructure, trivial to back up via volume mount                                          |
| Runtime    | Node.js (Alpine)           | Lightweight base image, SvelteKit Node adapter                                                                |
| Deployment | Single Docker image        | One `docker run` command, no orchestration required                                                           |
| Auth       | Single-user, session-based | One admin account; sessions handled in SvelteKit hooks, no external auth service                              |
| CMS        | DB-backed, custom-built    | Lightweight static page editing without an external CMS dependency                                            |

**Route structure** separates the two sides using SvelteKit route groups:

```
src/routes/
  (public)/          # Anonymous, read-only
    +layout.svelte
    +page.svelte     # Home (CMS-driven)
    about/
    [section]/       # Tier list per topic
  (admin)/           # Authenticated, guarded by hooks.server.ts
    +layout.svelte
    +page.svelte     # Dashboard
    entries/
    sections/
    cms/
    login/
```

**Database** is stored at `/app/data/db.sqlite`, with `/app/data` declared as a Docker volume so the file survives container restarts and can be backed up with a simple `cp`.

**Docker image** uses a multi-stage build: a full Node build stage compiles the app; the runtime stage is Node Alpine with production output only — no dev dependencies.

## Consequences

- The entire app is one process and one image: simple to deploy, simple to reason about.
- SQLite limits concurrent write throughput, which is acceptable for a single-user admin interface.
- Scaling horizontally is not possible with SQLite; this is an intentional trade-off for simplicity.
- Backup is trivial: copy one file.
- Switching to a networked database later would require replacing Drizzle's SQLite driver but not restructuring the app.
