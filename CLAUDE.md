## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`. Applies to every change without exception.

**Always** be brief. No filler or pleasantries.

## Verify before claiming done

Run `npm run verify` (lint + svelte-check + unit tests + coverage with thresholds) before reporting any non-trivial task as complete. The pre-commit hook runs lint + check + unit, but `verify` adds the coverage gate.

## Testing

Use `/test`. Pre-commit auto-runs unit + svelte-check. After UI-visible changes run smoke E2E (any DB state). Before merging or after schema changes run deterministic E2E (resets DB). Skip for config/docs-only work. Test artefacts live in gitignored `test-data/` — never share paths with the dev server.

**Importer / parser fixtures are hand-curated, not generated.** Real-world inputs (IMDb, Goodreads, BGG exports) come from a human picking representative rows; never use an LLM-generated sample, and prefer hand-picked over scripted-deterministic for "real export" fixtures. Hallucinated fields drift away from what real users actually upload.

## Plan mode (epics & multi-step features)

1. **Branch check first.** If on `main`, stop and ask the user for a branch name (kebab-case, no `feat/`/`chore/` prefix).
2. **Open with a Proposed ADR** — _unless the work has no architectural surface_ (cosmetic / layout / responsive-tweak work without a new pattern, dependency, or convention is just code changes; when in doubt, ask). Run `npm run test:unit:coverage` first and capture aggregate + per-file percentages for any file the plan will touch — the ADR's coverage note states whether they should hold or shift after implementation. Create the ADR via `/adr` in **Proposed** state, with no code changes before it exists.
3. **Structure the plan around milestones.** After each milestone, **STOP and PAUSE** for user review. After a `/commit`, continue immediately. Each milestone must leave the build green: bundle dependent steps (e.g. schema rename + call-site updates) into one milestone if needed.
4. **Branch audit before closing.** Self-driven review for loose ends: stale comments / READMEs / fixtures referring to renamed files; defensive code without tests; abandoned scaffolding; partially-wired features (UI without server, server without UI). Surface findings as a short list; let the user pick what to fix.
5. **Coverage check before closing.** Re-run `npm run test:unit:coverage`. If anything dropped, decide with the user: write tests, add a deliberate `vite.config.ts` exclude with reason, or document the gap in the ADR.
6. **Close with the ADR.** Update it to reflect decisions actually made, flip **Proposed → Accepted**. Plans that skipped the ADR also skip this step. If we did a feature from `TODO.md` remove it now.
7. **After the final milestone**, remind the user about `/learnings` (unless they want more tweaks).

**Never** include merging the branch as part of a plan — merges are separate.

## Verifying UI changes

Use Playwright MCP against `http://localhost:5173`. Ask the user to start the dev server if it's down. Skip for config/schema/test-only work. Save screenshots under `.playwright-mcp/` (gitignored) — bare filenames pollute the project root.

## Accessibility

Target: **WCAG 2.1 Level AA** ([ADR-0016](docs/decisions/0016-accessibility-and-semantic-html.md)). Don't suppress Svelte a11y warnings (`svelte-ignore a11y_*`) without strong justification — `svelte-check` enforces them in pre-commit. Smoke and deterministic E2E include axe-core scans.

## Running commands

Prefer `npm run <script>` over `npx <tool>` whenever `package.json` has a matching script. Use `npx` only when no script covers the use case.

For noisy command output (verify, coverage, full type-checks), redirect to a file under `.tmp/` (gitignored) and `Read` the relevant section — don't pipe to `| tail -N` (each variation triggers a permission prompt and produces sprawl). Example: `npm run verify > .tmp/verify.log 2>&1` then `Read` with offset.

## Code style

- No section-heading comments (`// ─── Section ───`). Extract a separate module if a heading is warranted.
- Keep SvelteKit-idiomatic imports (`$env/dynamic/private`, `$app/paths`) in app code. Code that also runs from standalone scripts (seed, tests) goes in a SvelteKit-free module that both can import.
- When a Svelte component grows complex, extract pure logic (filtering, validation, classification) into a `.ts` module for unit testing.
- Tailwind utilities are the default. Drop into a `<style>` block only for things Tailwind can't model cleanly (`::backdrop`, `@starting-style`, `::before`/`::after` with `content`, `grid-template-areas`, one-off `@keyframes`). Comment the reason at the top of the block. See the `frontend` skill for the full rule.

## Principles

- **Self-hostable first.** Every decision should make the app easier to run on a bare VPS with a single Docker command. No external services, paid infra.
- **Keep it simple.** Solve the actual problem. Don't abstract prematurely.
- **One image, one process.** Frontend, backend, and database run in a single Docker container.

## Database

All access via Drizzle ORM. No raw SQL in application code. Schema changes via Drizzle Kit migrations only. Migration files are committed.
