## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`. This applies to **every** change, no matter how small: one-line fixes, follow-up tweaks the user just asked for, formatting, etc. The user reviews the diff and decides when to commit. Never chain `git commit` after an edit, never run it from a `&&` pipeline alongside lint/check, and never treat "trivial" or "obvious" as an exception.

**Always** be brief. No filler or pleasantries.

## Skills

This project has purpose-built skills in `.claude/skills/` — use them instead of doing tasks manually. Key ones: `/commit`, `/db`, `/drizzle`, `/frontend`, `/lint`, `/markdown`, `/test`.

**Only `/commit` requires explicit user invocation** — see the Git rule above. Other skills (`/adr`, `/deps`, `/drizzle`, `/test`, `/lint`, etc.) follow normal harness approval and may be invoked as part of a plan or milestone when they're the right tool for the step. Prefer skills over running their underlying commands manually — they encode project conventions. If a skill's output says "continue immediately to the next step", treat that as informational, not authorisation to commit.

## Testing

Use `/test` for all testing — unit, E2E, and ad-hoc Playwright MCP verification. **Unit tests** and **svelte-check** run automatically in the pre-commit hook (~5s). Run **smoke tests** after UI-visible changes (quick, any DB state). Run **deterministic tests** before merging or after schema changes (resets DB, full validation). Skip tests for config-only or docs-only work. Test infrastructure must never share data paths with the dev server — all test artifacts live in the gitignored `test-data/` directory.

## ADRs

When creating a new ADR via `/adr`, always add a row to the **Architecture Decision Records** table in `README.md`.

## Plan mode (epics & multi-step features)

When entering plan mode for any non-trivial feature, follow this workflow:

1. **Branch check first.** Before drafting a plan, verify the current branch is not `main`. If it is, **stop** and ask the user for a branch name (suggest one based on the work) — do nothing else until a branch exists.
2. **Open with a Proposed ADR** — _unless the work has no architectural surface_. Run `npm run test:unit:coverage` first and capture the aggregate coverage percentages (statements/branches/funcs/lines) plus the per-file numbers for any file the plan will touch. Create the ADR via `/adr` in **Proposed** state, with no code changes before it exists. Keep the ADR **terse**: the decision, the alternatives considered in one line each, the consequences, and a one-line note on whether the captured coverage percentages should hold or shift after implementation (and why). Aim for an ADR that fits on a single screen — no narrative, no preamble, no recap of the problem the reader already knows. Skip the ADR for purely cosmetic, layout, or responsive-tweak work that doesn't introduce a new pattern, dependency, or convention — those are just code changes. When in doubt, ask the user.
3. **Structure the plan around milestones.** Group steps into logical milestones. After each milestone the plan must explicitly **STOP and PAUSE** for user review. The user will either request tweaks, make tweaks themselves, or invoke `/commit` — immediately after the commit, continue to the next milestone. Each milestone must leave the build green: the pre-commit hook runs lint + svelte-check + unit tests on every commit, so if M_n only compiles once M_n+1 lands (e.g. a schema rename whose call sites are updated in the next step), bundle them into one milestone instead.
4. **Coverage check before closing.** Just before the ADR-close milestone, re-run `npm run test:unit:coverage` and compare against the percentages captured in step 2. If any number dropped (or fell short of the expectation noted in the ADR), pause and decide with the user: write the missing tests, add a deliberate exclude to `vite.config.ts` with a reason, or document the gap in the ADR. Don't proceed to step 5 until coverage is at an acceptable level.
5. **Close with the ADR.** When the plan opened with an ADR, the final milestone is always: update it to reflect decisions actually made during implementation (including any coverage shift from step 4), then change its status from **Proposed** to **Accepted**. Plans that legitimately skipped the ADR also skip this step.
6. **After the final milestone**, remind the user about the `/learnings` skill (unless they want more tweaks).

**Never** include merging the branch as part of a plan — merges are a separate activity.

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
