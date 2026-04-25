# ADR-0021: Admin Confirmation Dialog and Typed Double-Confirmation

## Status

Accepted

## Context

Admin destructive actions used the browser's `confirm()`. Two problems:

- **Bug.** On `/admin/categories`, _Cancel_ still deleted. A synchronous `confirm()` inside `onsubmit` could not reliably suppress the `fetch` already queued by `use:enhance`. Categories cascade-delete items, so the blast radius was large.
- **UX.** Native dialog was unthemed and ambiguous about which button is destructive. Some actions (deleting a whole category) warrant more friction than a single _OK_.

Wrapping the public `Dialog.svelte` was rejected: its hardcoded content-sized chrome doesn't fit an admin confirm, and wrapping would couple admin/public sizing.

## Decision

1. Built `src/lib/components/admin/ConfirmDialog.svelte` directly on `<dialog>`. _Cancel_ autofocused so accidental Enter never deletes.
2. Destructive actions drive imperatively from `onconfirm` (`fetch('?/...', …)` then `goto`/`invalidateAll`). Dropped `use:enhance` + `onsubmit={confirm(...)}` for those forms — the race is impossible by construction.
3. Generic typed-confirmation mode via `requireTypedConfirmation` / `typedConfirmationLabel` / `typedConfirmationHint` props (slug-agnostic). Applied to category deletes (list + detail) where the cascade hits items. Single-item deletes, CMS reset, sort-by-score, and discard-unsaved kept as simple confirms.
4. Migrated every admin `confirm()` call site (categories list, category detail, category create, items list, item form, CMS general). `Button.svelte` got `disabled:` styling so the typed-confirmation gate is visibly inactive.
5. E2E regressions: `admin-categories.e2e.ts` exercises cancel-doesn't-delete, then drives the typed-confirmation gate (disabled by default, disabled on wrong text, enabled on correct slug). `admin-items.e2e.ts` adds a cancel-doesn't-delete check on the items list.

## Consequences

- Bug fixed by construction — no form submission is tied to the destructive click.
- Small `<dialog>` open/close logic duplicated with public `Dialog.svelte` until a third caller justifies extracting a shared `useDialog` action — rule of three.
- `Button.svelte` now disables visually via Tailwind `disabled:` utilities; existing `disabled` consumers (CMS Save when over byte limit) get the styling for free.

Future typed-confirmation candidates (out of scope here): bulk operations, account deletion, destructive imports.
