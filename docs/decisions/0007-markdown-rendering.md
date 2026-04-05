# ADR-0007: Markdown Rendering

## Status

Accepted

## Context

tierdom-pro stores text content in the database (category descriptions, item
reviews) and displays static pages (Home, About). All of this is currently
rendered as plain text or hardcoded HTML. Authors want to use basic formatting
— bold, italics, paragraphs, links — without writing raw HTML.

The app also needs a lightweight CMS mechanism for the Home and About pages so
their content can be edited through the (future) admin interface rather than
requiring code changes.

## Decision

**Markdown is the authoring format for all user-facing text content.** Authors
write Markdown in admin form fields; the public site renders it as styled HTML.

### Library: `marked`

`marked` is a fast, lightweight, synchronous Markdown parser with good
TypeScript support and zero dependencies. It covers GitHub Flavored Markdown
(tables, strikethrough, task lists) out of the box. The unified/remark
ecosystem was considered but is heavier than needed — the project does not
require AST transforms or custom plugins.

### Sanitization: `isomorphic-dompurify`

All rendered HTML is sanitized through DOMPurify before reaching the template.
`isomorphic-dompurify` wraps DOMPurify for server-side use (via `jsdom`). This
is defense-in-depth: even though the admin is single-user, sanitization
prevents accidental XSS from copy-pasted content or future multi-user
scenarios.

### Rendering: server-side only

Markdown-to-HTML conversion happens in `+page.server.ts` load functions. The
utility lives in `$lib/server/markdown.ts` so it is never bundled for the
client. Components receive pre-rendered, sanitized HTML and display it with
Svelte's `{@html}` directive.

### Typography: `@tailwindcss/typography`

The `prose prose-invert` utility classes from `@tailwindcss/typography` provide
typographic styling for rendered Markdown blocks. `prose-invert` handles the
light-on-dark color flip. Custom CSS variable overrides on `.prose` remap the
`--tw-prose-invert-*` source variables to the app's semantic `--c-*` color
tokens (ADR-0005), so prose content uses the app's exact palette rather than
the default inverted grays.

### CMS: `page` table

A new `page` table (`slug`, `title`, `content`) stores Markdown content for
the Home and About pages. The hardcoded hero section and About page HTML are
replaced with CMS-driven Markdown rendered through the same pipeline. This
aligns with the "Built-in CMS" roadmap item and will integrate naturally with
the admin interface (ADR-0006) when page editing is added.

### Lint: `{@html}` suppression

The `svelte/no-at-html-tags` ESLint rule (from `svelte.configs.recommended`)
flags every `{@html}` usage. Since all HTML is sanitized server-side through
DOMPurify before reaching the template, each usage carries an inline
`eslint-disable-next-line` comment explaining the sanitization guarantee.

## Consequences

- All user-authored text supports Markdown formatting immediately — no
  migration needed since plain text is valid Markdown.
- The `isomorphic-dompurify` dependency pulls in `jsdom` (~2 MB), which
  increases the server-side bundle. This is acceptable for a Docker-deployed
  app where bundle size is not a primary constraint.
- The Home and About pages are now database-driven. If the database is empty
  or the page record is missing, the routes must handle that gracefully (404
  or fallback content).
- Future admin pages for editing CMS content only need a textarea and a save
  button — the rendering pipeline is already in place.
