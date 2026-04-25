# ADR-0021: Admin Confirmation Dialog and Typed Double-Confirmation

## Status

Proposed

## Context

Admin destructive actions use the browser's `confirm()`. Two problems:

- **Bug.** On `/admin/categories`, _Cancel_ still deletes. A synchronous `confirm()` inside `onsubmit` cannot reliably suppress the `fetch` already queued by `use:enhance`. Categories cascade-delete items, so the blast radius is large.
- **UX.** Native dialog is unthemed and ambiguous about which button is destructive. Some actions (e.g. deleting a whole category) warrant more friction than a single _OK_.

We considered wrapping the public `Dialog.svelte`, but its hardcoded content-sized chrome doesn't fit an admin confirm, and wrapping would couple admin/public sizing.

## Decision

1. New `src/lib/components/admin/ConfirmDialog.svelte` built directly on `<dialog>`. _Cancel_ autofocused.
2. Deletes drive imperatively from `onconfirm` (`fetch('?/delete', …)` + `invalidateAll()`); drop `use:enhance` + `onsubmit={confirm(...)}` for destructive actions.
3. Opt-in typed-confirmation mode via generic props (`requireTypedConfirmation`, etc.) — not slug-specific. Apply to category deletes; keep simple confirm elsewhere.
4. Migrate all admin `confirm()` sites.
5. E2E regression: _Cancel_ leaves the entity intact.

## Consequences

- Bug fixed by construction — no form submission is tied to the click.
- Small `<dialog>` open/close logic duplicated with public `Dialog.svelte` until a third caller justifies extraction.
- Every existing admin destructive action gets touched once.

Future typed-confirmation candidates (out of scope): bulk operations, account deletion, destructive imports.
