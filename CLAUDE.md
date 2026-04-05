## Git

**Never** add a `Co-Authored-By` trailer or any Claude attribution to commit messages.

---

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, drizzle, sveltekit-adapter, mcp

---

## Verifying Changes

Use the **Playwright MCP** (`browser_navigate`, `browser_snapshot`, `browser_evaluate`, etc.) to verify UI changes against the dev server at `http://localhost:5173`. This is the preferred method — only fall back to `curl` if Playwright genuinely fails (e.g. browser keeps closing after retries).

**Dev server assumption:** The user usually has `npm run dev` running on port 5173. If a request to `localhost:5173` fails, **stop and ask the user** — either they need to start the dev server, or you should offer to start one on a different port (e.g. `npm run dev -- --port 5174`) in the background.

**When to verify:** After completing a set of UI-visible changes (new pages, component refactors, styling fixes). Not needed for config-only, schema-only, or test-only changes.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
