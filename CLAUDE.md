## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

**Never** commit on your own — always wait for the user to invoke `/commit`.

## Skills

This project has purpose-built skills in `.claude/skills/` — use them instead of doing tasks manually. Key ones: `/commit`, `/db`, `/drizzle`, `/frontend`, `/lint`.

## Verifying UI changes

Use **Playwright MCP** (`browser_navigate`, `browser_snapshot`, `browser_evaluate`, etc.) against the dev server at `http://localhost:5173`. If the connection fails, ask the user to start the dev server. Only verify after UI-visible changes — skip for config, schema, or test-only work.

## Svelte MCP

Use the Svelte MCP server's `list-sections` and `get-documentation` tools when working on Svelte/SvelteKit code. Run `svelte-autofixer` on new or modified `.svelte` files before finalising.
