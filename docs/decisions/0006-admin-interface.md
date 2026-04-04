# ADR-0006: Admin Interface

## Status

Accepted

## Context

tierdom-pro needs a back-office where the site owner can manage categories, tier
list items, scores, ordering, and per-category tier cutoffs. The admin is
single-user and self-hosted, so enterprise-grade features (RBAC, audit logs,
multi-tenancy) are unnecessary overhead. The interface must be functional,
fast to build, and easy to maintain without a dedicated frontend framework or
external CMS dependency.

Key constraints:

- SvelteKit already handles routing, SSR, and form processing — adding a
  separate admin framework would duplicate infrastructure.
- The domain model (ADR-0004) is small enough that a handful of CRUD pages
  covers the entire surface area.
- The deployment target (ADR-0002) is a single Docker image; the admin ships
  alongside the public site in one process.

## Decision

**Build the admin as plain SvelteKit routes under `/admin`, using native form
actions for all mutations.**

### Route structure

```
src/routes/admin/
  +layout.svelte           # Admin-specific nav (Dashboard, Categories, back link)
  +page.svelte             # Dashboard with entity counts
  +page.server.ts
  categories/
    +page.svelte           # Category list with create, delete, reorder
    +page.server.ts
    [id]/
      +page.svelte         # Category detail: edit fields, cutoffs, manage items
      +page.server.ts
  items/
    [id]/
      +page.svelte         # Item edit form
      +page.server.ts
```

### Form actions over API routes

All create, update, delete, and reorder operations are implemented as SvelteKit
form actions (`export const actions = { ... }` in `+page.server.ts`) rather than
standalone `+server.ts` API endpoints.

- Actions are colocated with the page that uses them, keeping related logic in
  one file.
- Progressive enhancement via `use:enhance` means forms work without JS and
  upgrade to SPA-style navigation when JS is available.
- No client-side fetch wrappers, no custom API layer, no request/response DTOs.

### Separate admin layout

The admin layout (`/admin/+layout.svelte`) provides its own navigation bar
(Dashboard, Categories, back-to-site link) that replaces the public Navbar.
SvelteKit's nested layout system handles this naturally: the root layout still
provides the page shell and global styles, while the admin layout swaps the
navigation context.

### Reusable form component

A single `FormField` component (`$lib/components/admin/FormField.svelte`)
handles all admin form inputs. It supports text, number, and multiline variants,
required indicators, and help text. One component covers the entire admin form
surface, avoiding a component library dependency.

### Inline validation in actions

Validation (e.g. score must be 0-100, name is required) happens inside the form
action handler, not in a separate service or validation layer. Errors are
returned via SvelteKit's `fail()` helper. This is sufficient for a single-user
admin with a small domain model.

### Auto-slugification

When creating categories or items, the slug is auto-generated from the name if
left blank. This reduces friction for the common case while still allowing
manual slug overrides for SEO or readability.

### Ordering via swap

Category and item ordering uses an integer `order` field (ADR-0004). The admin
exposes up/down reorder buttons that swap `order` values between adjacent rows.
This gives explicit editorial control without drag-and-drop complexity.

### No authentication (yet)

The admin routes are currently unprotected. Authentication is a separate concern
(ADR-0002 specifies session-based single-user auth) and will be layered on via
SvelteKit hooks without changing the admin routes themselves. The admin
interface is designed to be auth-agnostic: when the auth hook is added, it
guards the `/admin` route group and the pages inside remain unchanged.

## Consequences

- The admin is a thin layer of SvelteKit conventions, not a custom framework.
  Any SvelteKit developer can read and extend it without learning new patterns.
- Form actions keep mutations server-side by default, reducing the attack
  surface (no exposed JSON API to secure separately).
- Progressive enhancement means the admin is functional even if client JS fails
  to load.
- The single `FormField` component is intentionally minimal. If the admin grows
  significantly, it may warrant a small component library — but not before.
- Adding authentication later is a hooks-level change, not a routes-level
  rewrite. The admin pages do not need to know about auth.
- There is no undo/soft-delete. Deletes are permanent and cascade via foreign
  keys. For a single-user personal app this is acceptable; it would need
  revisiting if the app ever served multiple users.
