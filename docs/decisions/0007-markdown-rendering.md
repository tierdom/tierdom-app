# ADR-0007: Markdown Rendering

## Status

Accepted

## Context

Text content (category descriptions, item reviews) and static pages (Home, About) are stored as plain text or hardcoded HTML.
Authors want basic formatting — bold, italics, paragraphs, links — without writing raw HTML.
The Home and About pages also need a lightweight CMS so content is editable through admin rather than via code change.

## Decision

Markdown is the authoring format for all user-facing text. Authors write Markdown in admin form fields; the public site renders it as styled HTML.

- **Parser: `marked`.** Fast, synchronous, zero deps, GFM out of the box. Rejected: unified/remark — heavier than needed; no AST transforms required.
- **Sanitization: `isomorphic-dompurify`.** All rendered HTML goes through DOMPurify before reaching templates — defense-in-depth against accidental or future-multi-user XSS. Wraps DOMPurify for SSR via `jsdom`.
- **Server-side only.** Conversion happens in `+page.server.ts` load functions; the utility lives in `$lib/server/markdown.ts` so it is never bundled for the client. Templates render the pre-sanitized HTML with `{@html}`.
- **Typography: `@tailwindcss/typography`.** `prose prose-invert` styles rendered Markdown blocks. CSS variable overrides remap `--tw-prose-invert-*` to the app's `--c-*` semantic tokens (ADR-0005), so prose uses the app palette rather than the default inverted grays.
- **CMS: `page` table** (`slug`, `title`, `content`) holds Markdown for Home and About, replacing hardcoded HTML. Integrates naturally with admin (ADR-0006) when page editing lands.
- **Lint:** each `{@html}` carries an inline `eslint-disable-next-line svelte/no-at-html-tags` since the rule fires on every usage; the sanitization guarantee justifies it.

## Consequences

- All authored text supports Markdown immediately — plain text is valid Markdown, no migration needed.
- `isomorphic-dompurify` pulls in `jsdom` (~2 MB), increasing the server-side bundle. Acceptable for a Docker-deployed app.
- Home/About are now DB-driven; missing rows must be handled gracefully (404 or fallback).
- Future admin CMS pages need only a textarea + save — the rendering pipeline is already in place.
