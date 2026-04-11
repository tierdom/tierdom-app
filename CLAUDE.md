## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`.

**Always** be brief. No filler or pleasantries.

## Skills

This project has purpose-built skills in `.claude/skills/` — use them instead of doing tasks manually. Key ones: `/commit`, `/db`, `/drizzle`, `/frontend`, `/lint`, `/markdown`, `/test`.

## Testing

Use `/test` to run E2E tests. Run **smoke tests** after UI-visible changes (quick, any DB state). Run **deterministic tests** before merging or after schema changes (resets DB, full validation). Skip tests for config-only or docs-only work.

## Verifying UI changes

Use **Playwright MCP** (`browser_navigate`, `browser_snapshot`, `browser_evaluate`, etc.) against the dev server at `http://localhost:5173`. If the connection fails, ask the user to start the dev server. Only verify after UI-visible changes — skip for config, schema, or test-only work.

## Svelte MCP

Use the Svelte MCP server's `list-sections` and `get-documentation` tools when working on Svelte/SvelteKit code. Run `svelte-autofixer` on new or modified `.svelte` files before finalising.

## Principles

- **Self-hostable first.** Every decision should make the app easier to run on a bare VPS with a single Docker command. No external services, cloud platforms, or paid infrastructure.
- **Keep it simple.** Solve the actual problem. Don't abstract prematurely or add features that aren't needed yet.
- **One image, one process.** The entire app — frontend, backend, database — runs in a single Docker container. Resist the urge to split things up.

## Database

- All database access goes through Drizzle ORM. No raw SQL in application code.
- Schema changes are managed via Drizzle Kit migrations — never modify the database directly.
- Migration files are committed to the repository.
