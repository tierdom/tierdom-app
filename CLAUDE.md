## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`.

## Skills

This project has purpose-built skills in `.claude/skills/` — use them instead of doing tasks manually. Key ones: `/commit`, `/db`, `/drizzle`, `/frontend`, `/lint`.

## Verifying UI changes

Use **Playwright MCP** (`browser_navigate`, `browser_snapshot`, `browser_evaluate`, etc.) against the dev server at `http://localhost:5173`. If the connection fails, ask the user to start the dev server. Only verify after UI-visible changes — skip for config, schema, or test-only work.

## Svelte MCP

Use the Svelte MCP server's `list-sections` and `get-documentation` tools when working on Svelte/SvelteKit code. Run `svelte-autofixer` on new or modified `.svelte` files before finalising.

## Principles

- **Self-hostable first.** Every decision should make the app easier to run on a bare VPS with a single Docker command. Avoid dependencies on external services, cloud platforms, or paid infrastructure.
- **Keep it simple.** Solve the actual problem. Don't abstract prematurely or add features that aren't needed yet.
- **One image, one process.** The entire app — frontend, backend, database — runs in a single Docker container. Resist the urge to split things up.

## TypeScript

- Strict mode is on. No `any` unless truly unavoidable, and document why.
- Prefer explicit types over inferred ones in function signatures.
- Keep types close to where they're used. Avoid a global `types.ts` dumping ground.

## Database

- All database access goes through Drizzle ORM. No raw SQL in application code.
- Schema changes are managed via Drizzle Kit migrations — never modify the database directly.
- Migration files are committed to the repository.
- The SQLite file lives at `/app/data/db.sqlite`. Do not hardcode this path; use an environment variable or config constant.

## Docker image hygiene

- Use a multi-stage Dockerfile: build stage installs all dependencies and compiles; runtime stage contains only the production build and runtime dependencies.
- No `devDependencies` in the final image.
- Keep the base image as `node:alpine` unless there's a specific reason to use a larger base.
- Do not copy unnecessary files into the image (use `.dockerignore`).

## Authentication

- No external auth services. Authentication is self-contained.
- Admin session handling lives in `src/hooks.server.ts`.
- The single admin password is set via an environment variable. It is never hardcoded or committed.

## Folder conventions

Follow SvelteKit conventions:

- Route logic in `src/routes/`
- Shared server utilities in `src/lib/server/`
- Shared client utilities in `src/lib/`
- Database schema and queries in `src/lib/server/db/`
- Drizzle migrations in `drizzle/`

## What to avoid

- No external CMS, no headless services, no third-party auth.
- No microservices, no separate API server.
- No cloud-specific features (S3, Lambda, etc.).
- No frontend state management libraries unless SSR falls short for a specific use case.
