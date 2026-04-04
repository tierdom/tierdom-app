# ADR-0003: Tooling and Developer Experience

## Status

Accepted

## Context

The project needs a consistent, reproducible development environment with good
tooling for code quality, testing, and AI-assisted development. All choices should
stay within the SvelteKit ecosystem and avoid unnecessary complexity.

## Decision

**Scaffold** via the official `sv` CLI (v0.14.0+), which manages all add-on
integration and keeps setup reproducible with a single command.

**Add-ons chosen:**

| Tool            | Package                    | Purpose                                      |
| --------------- | -------------------------- | -------------------------------------------- |
| TypeScript      | built-in                   | End-to-end type safety                       |
| ESLint          | `eslint` add-on            | Code quality linting                         |
| Prettier        | `prettier` add-on          | Consistent code formatting                   |
| Tailwind CSS v4 | `tailwindcss` add-on       | Utility-first styling, minimal config        |
| Drizzle ORM     | `drizzle` add-on           | Type-safe SQLite access via `better-sqlite3` |
| Vitest          | `vitest` add-on            | Unit testing, co-located with source         |
| Playwright      | `playwright` add-on        | E2E browser testing                          |
| Node adapter    | `sveltekit-adapter` add-on | Self-hosted deployment via Docker            |
| Svelte MCP      | `mcp` add-on               | AI access to live Svelte 5 / SvelteKit docs  |

**MCP servers** configured in `.mcp.json` for Claude Code:

| Server     | Package                               | Purpose                                    |
| ---------- | ------------------------------------- | ------------------------------------------ |
| Svelte     | `@sveltejs/mcp`                       | Svelte 5 runes + SvelteKit docs, autofixer |
| Playwright | `@playwright/mcp`                     | Browser automation for closed-loop E2E     |
| SQLite     | `@modelcontextprotocol/server-sqlite` | Query the dev DB directly                  |

**Database driver:** `better-sqlite3` over `libsql` — synchronous API is simpler
for a single-user self-hosted app with no need for remote/Turso connectivity.

**`data/` directory** is tracked in git (via `.gitkeep`) as the local DB mount
point. `*.db` and `*.sqlite` files inside it are gitignored.

## Consequences

- One-command scaffold reproduces the full setup from scratch.
- ESLint + Prettier are enforced via the `/lint` Claude Code skill.
- Svelte MCP gives Claude access to accurate Svelte 5 rune syntax during coding.
- Playwright MCP allows Claude to verify UI changes in a real browser.
- SQLite MCP allows Claude to inspect and reason about live data during development.
- `better-sqlite3` is synchronous — works well with SvelteKit's server-side loaders
  but requires care if async patterns are needed later.
