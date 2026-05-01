# ADR-0006: Admin Interface

## Status

Accepted

## Context

A back-office is needed to manage categories, items, scores, ordering, and tier cutoffs.
Single-user, self-hosted (ADR-0002) — RBAC, audit logs, and multi-tenancy are out of scope.
SvelteKit already covers routing, SSR, and form processing; the domain (ADR-0004) is small enough that plain CRUD pages cover it.
Deployment target (ADR-0002) is a single Docker image; admin ships alongside the public site.

## Decision

Build the admin as plain SvelteKit routes under `/admin`, using native form actions for all mutations.

- **Form actions over API routes.** Mutations live in `+page.server.ts` next to the page that uses them. `use:enhance` gives progressive enhancement; no client-side fetch wrappers, DTOs, or custom API layer.
- **Separate admin layout.** `/admin/+layout.svelte` provides admin navigation (Dashboard, Categories, back-to-site) using SvelteKit's nested layouts; the root layout still owns the page shell and global styles.
- **One reusable `FormField` component** covers text/number/multiline inputs across the admin surface — no component library dependency.
- **Inline validation in actions** with `fail()` for errors. No separate validation layer.
- **Auto-slugification.** Slug auto-generates from name when blank; manual override allowed.
- **Reorder via swap.** Up/down buttons swap the integer `order` field (ADR-0004). No drag-and-drop.
- **Auth-agnostic.** Routes are unprotected here; auth is layered on via SvelteKit hooks (later, ADR-0010) without changing admin pages.

## Consequences

- The admin is SvelteKit conventions, not a custom framework. Any SvelteKit dev can read and extend it.
- Form actions keep mutations server-side — no exposed JSON API to secure separately.
- Progressive enhancement means admin works without client JS.
- Adding auth later is a hooks-level change; admin pages don't need to know about it.
- No undo/soft-delete here — deletes are permanent and cascade via FK. Acceptable for a single-user personal app at this stage; revisited later (ADR-0022).
