# ADR-0018: Category Prop Keys

## Status

Accepted

## Context

ADR-0017 introduced item-level props — key-value pairs stored as JSON on each item.
Props are freeform: every key is typed from scratch, with no guidance or consistency enforcement within a category.

In practice, items in the same category tend to share the same keys.
Video games all need "Platform", books need "Year" and "ISBN", movies need "Genre".
Without suggestions, users mistype or vary capitalisation ("platform" vs "Platform" vs "plattform"), making it hard to keep metadata consistent.

ADR-0017 anticipated this, noting that "known props" with specialised support could be added later.
This ADR delivers the first step: a per-category list of suggested prop keys that guide — but do not enforce — consistent key usage.

## Decision

Add an ordered `prop_keys` JSON column to the `category` table storing `string[]` — the category's suggested prop key names.

**Storage:** `text('prop_keys', { mode: 'json' }).$type<string[]>().notNull().default([])` — the same JSON-text pattern used for item props.

**Constraints:**

- Maximum 10 keys per category
- Keys: non-empty, max 64 characters (reuses `MAX_KEY_LENGTH`), unique within the category (case-insensitive)

**Category admin forms** gain a PropKeyEditor — an ordered string list with add, remove, and drag-to-reorder — matching the existing PropEditor UX.

**Item PropEditor changes:**

- The key input becomes an ARIA combobox with autocomplete, suggesting the current category's prop keys.
  Already-used keys are excluded from the dropdown.
  The user can still type any key freely.
- When a prop key does not match any of the category's suggested keys, the row shows a subtle visual marker (dashed left border) to signal that it is non-standard.
  This is informational, not a validation error.

**Data flow:** The item page load includes each category's `propKeys`.
When the user switches categories in the item form, the autocomplete suggestions update reactively.

**Public pages are unchanged.** They display props as-is, with no awareness of category prop keys.

## Consequences

- **Consistent metadata.** Categories can define a canonical set of keys, reducing typos and drift across items.
- **Progressive disclosure.** Power users can still create arbitrary keys; the non-standard marker keeps them aware without blocking them.
- **Accessible autocomplete.** The combobox follows the ARIA combobox pattern with full keyboard navigation.
- **Minimal schema change.** One new JSON column on `category`, one migration. No new tables or joins.
- **Not enforced.** Category prop keys are purely suggestive. Items are never rejected for using keys outside the list.
- **Future extensibility.** Per-key metadata (value type, enum options, validation) can be added later by evolving the `prop_keys` column from `string[]` to an array of objects.
