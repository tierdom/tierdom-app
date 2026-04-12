# ADR-0016: Accessibility and Semantic HTML

## Status

Accepted

## Context

The README roadmap lists "Complete accessibility review + all fixes" as a known issue.
The app has foundational a11y work in place (semantic HTML in some areas, ARIA labels on key controls, native `<dialog>`, form labels) but lacks systematic enforcement and has concrete gaps: missing landmark labels, inconsistent heading hierarchy, pseudo-table layouts using divs, and no automated WCAG testing.

As a self-hosted application, Tierdom should be usable by everyone, including people who rely on assistive technology.
Additionally, proper semantic HTML structure ensures pages are readable as plain unstyled documents — beneficial for screen readers, search engines, and LLMs that may visit the site.

## Decision

Target **WCAG 2.1 Level AA** compliance and enforce semantic HTML throughout.

### Tooling

- **ESLint a11y rules**: Promote all `svelte/a11y-*` rules from `eslint-plugin-svelte` (already installed) to `error` severity so they block commits via the pre-commit hook.
- **axe-core in Playwright**: Install `@axe-core/playwright` and add E2E accessibility tests (smoke + deterministic) that run axe on every page and assert zero WCAG 2.1 AA violations.

### Enforcement

- Svelte a11y lint rules run on every commit (pre-commit hook).
- Axe E2E tests run as part of the smoke and deterministic test suites.
- The `/frontend` skill documents accessibility requirements so new components are built correctly from the start.
- CLAUDE.md records the WCAG 2.1 AA target and the "don't suppress a11y rules without justification" policy.

### Scope of fixes

Straightforward fixes are applied immediately: skip links, nav landmarks, ARIA attributes, form field descriptions, combobox/menu patterns, semantic table markup, heading hierarchy.

Larger rework items (keyboard-accessible drag-and-drop reordering, full color contrast audit, `aria-live` regions) are deferred to the roadmap as future tasks.

## Consequences

**Positive:**

- Systematic a11y enforcement catches regressions automatically.
- Semantic HTML improves usability for assistive technology, SEO, and machine readability.
- No new runtime dependencies — `@axe-core/playwright` is dev-only.
- Builds on existing `eslint-plugin-svelte` — no new linting packages needed.

**Negative:**

- Existing `svelte-ignore a11y_*` suppressions must be resolved before the lint rules can be promoted to errors.
- Some interactive patterns (TagPicker combobox, UserMenu dropdown) need ARIA attribute additions that increase template complexity.
- Deferred items (SortableList keyboard reordering, color contrast audit) remain as known gaps until addressed.

**Neutral:**

- E2E test suite runtime increases slightly (axe scans add ~1-2s per page).
- Developers must consider accessibility for every new component — this is intentional friction.
