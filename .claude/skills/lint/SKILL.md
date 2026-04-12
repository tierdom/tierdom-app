---
name: lint
description: Run linting and formatting checks on the project. Uses ESLint, Prettier, and svelte-check. Reports issues and offers to auto-fix.
allowed-tools: Bash Read
---

Run the full linting and formatting suite for this SvelteKit + TypeScript project.

1. Run `npm run check` (svelte-check for TypeScript, Svelte type errors, and Svelte a11y warnings).
2. Run `npm run lint` (ESLint for code quality issues).
3. Run `npm run format -- --check` (Prettier for formatting violations).
4. Summarize all issues found grouped by type (type errors, lint errors, formatting).
5. Ask whether to auto-fix what can be fixed automatically:
   - Prettier: run `npm run format` to fix formatting
   - ESLint: run `npm run lint -- --fix` for auto-fixable rules
   - Type errors: these require manual fixes — show them clearly

If $ARGUMENTS specifies a file or directory, scope the checks to that path only.

$ARGUMENTS
