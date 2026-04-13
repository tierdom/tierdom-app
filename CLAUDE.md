## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`.

**Always** be brief. No filler or pleasantries.

## Skills

This project has purpose-built skills in `.claude/skills/` — use them instead of doing tasks manually. Key ones: `/commit`, `/db`, `/drizzle`, `/frontend`, `/lint`, `/markdown`, `/test`.

## Testing

Use `/test` for all testing — unit, E2E, and ad-hoc Playwright MCP verification. **Unit tests** and **svelte-check** run automatically in the pre-commit hook (~5s). Run **smoke tests** after UI-visible changes (quick, any DB state). Run **deterministic tests** before merging or after schema changes (resets DB, full validation). Skip tests for config-only or docs-only work. Test infrastructure must never share data paths with the dev server — all test artifacts live in the gitignored `test-data/` directory.

## ADRs

When creating a new ADR via `/adr`, always add a row to the **Architecture Decision Records** table in `README.md`.

## Epics

For multi-milestone features: commit a **Proposed ADR first** before any code changes. Accept the ADR in the final milestone only after all code is verified.

## Verifying UI changes

Use **Playwright MCP** (`browser_navigate`, `browser_snapshot`, `browser_evaluate`, etc.) against the dev server at `http://localhost:5173`. If the connection fails, ask the user to start the dev server. Only verify after UI-visible changes — skip for config, schema, or test-only work. When saving screenshots, always use a `.playwright-mcp/` prefix (e.g. `.playwright-mcp/my-screenshot.png`) — that directory is gitignored; bare filenames land in the project root.

## Svelte MCP

Use the Svelte MCP server's `list-sections` and `get-documentation` tools when working on Svelte/SvelteKit code. Run `svelte-autofixer` on new or modified `.svelte` files before finalising.

## Accessibility

Target: **WCAG 2.1 Level AA** ([ADR-0016](docs/decisions/0016-accessibility-and-semantic-html.md)). Svelte compiler a11y warnings are enforced via `svelte-check` in the pre-commit hook — don't suppress them (`svelte-ignore a11y_*`) without strong justification. Smoke and deterministic E2E suites include axe-core scans — run them after UI-visible changes. Pages must use semantic HTML and read well as plain unstyled documents.

## Running commands

Prefer `npm run <script>` over `npx <tool>` whenever `package.json` has a matching script. Scripts encode project-specific flags and paths. Use `npx` only when no script covers the use case (e.g. single-file test runs, one-off tools).

## Code style

- Don't use section-heading comments (e.g. `// ─── Section ───`) to delimit code within a file. If a block of code warrants its own heading, extract it to a separate module.
- Keep SvelteKit-idiomatic imports (`$env/dynamic/private`, `$app/paths`, etc.) in app code. When code also needs to run from standalone scripts (seed, tests), isolate the SvelteKit-free logic into its own module that both the app and the script can import.
- When a Svelte component grows complex, extract pure logic (filtering, validation, classification) into the nearest `.ts` module so it can be unit tested without rendering the component.

## Principles

- **Self-hostable first.** Every decision should make the app easier to run on a bare VPS with a single Docker command. No external services, cloud platforms, or paid infrastructure.
- **Keep it simple.** Solve the actual problem. Don't abstract prematurely or add features that aren't needed yet.
- **One image, one process.** The entire app — frontend, backend, database — runs in a single Docker container. Resist the urge to split things up.

## Database

- All database access goes through Drizzle ORM. No raw SQL in application code.
- Schema changes are managed via Drizzle Kit migrations — never modify the database directly.
- Migration files are committed to the repository.
