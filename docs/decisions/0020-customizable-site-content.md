# ADR-0020: Customizable Site Content via Generalized CMS

## Status

Proposed

## Context

The README lists "Option to customize the footer" as a wanted feature.
Today the footer in `src/routes/+layout.svelte` is hardcoded HTML.

We already have a small CMS at `/admin/pages` for editable markdown pages (ADR-0006, ADR-0007).
The footer is the first of several site-wide pieces of content we want admins to edit — a short list of likely future additions includes a custom logo, site title, and social media metadata.

Rather than bolt a one-off "footer" admin screen onto the app, we want to generalize the existing CMS so new pieces of site-wide content can be added with minimal ceremony.

## Decision

### 1. Rename `/admin/pages` → `/admin/cms`

The admin CMS section is broadened to cover both navigable pages and site-wide content fragments.
The overview page has two sibling sections:

- **Pages** — existing list of markdown pages.
- **General Content** — new list of site-wide content fragments. Starts with one entry: **Footer**.

Routes:

- `/admin/cms` — overview (both sections).
- `/admin/cms/pages/[slug]` — page edit (existing, moved from `/admin/pages/[slug]`).
- `/admin/cms/general/[key]` — generic edit form for a whitelisted site-content key.

This is a **breaking URL change** (no redirects) — acceptable pre-1.0.

### 2. Key-value `site_setting` table

New table:

```sql
CREATE TABLE site_setting (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

…with the same `updated_at` trigger pattern used by other tables (see `drizzle/0000_initial_schema.sql`).

- Values are plain text.
  Structured values (e.g. social metadata) are serialized as JSON at the application layer.
- Recognized keys are **whitelisted in the route layer** (initially `['footer']`) so `/admin/cms/general/[key]` isn't a generic write surface for arbitrary keys.
- No seed row is required: consumers fall back to a built-in default when the row is absent or empty.

### 3. Footer as the first consumer

- Root `+layout.server.ts` loads the `footer` setting and renders it via `renderMarkdown` from `src/lib/server/markdown.ts` (ADR-0007).
- `+layout.svelte` renders the result inside the existing `<footer>` wrapper with the `.prose` styling convention.
- If the row is absent/empty, a built-in default preserves the current hardcoded content.

### Alternatives considered

- **Typed-column `site_config` table** (one row, named columns).
  Rejected: each new piece of content requires a migration, and the shape doesn't fit open-ended or optional fields well.
- **Extend the existing `page` table with a type discriminator.**
  Rejected: conflates navigable pages (slug-addressable, listed in site nav) with site-wide fragments (keyed, embedded into layouts). Different lifecycles, different UX.

## Consequences

- **Breaking URL change** for `/admin/pages` → `/admin/cms` (no redirects). Acceptable pre-1.0.
- One new table, no new dependencies.
- Future site content (logo hash, site title, social meta, …) is **additive**: whitelist a new key and add an edit affordance on the CMS overview — no schema migration needed.
- The `/admin/cms/general/[key]` key whitelist must be kept in sync as new content types are added; this is a small, deliberate friction that prevents accidental write surface growth.
- Related: ADR-0006 (Admin Interface), ADR-0007 (Markdown Rendering).
